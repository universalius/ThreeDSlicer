using Microsoft.UI;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.Web.WebView2.Core;
using Newtonsoft.Json;
using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using ThreeDSlicer.Application.Features.CrossSessionSvgBuilder;
using ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter;
using ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter.Models;
using ThreeDSlicer.Application.Features.ObjToMeshConverter;
using ThreeDSlicer.Application.Models;
using WinRT.Interop;
using static ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter.CylinderObjectToSvgConverterSevice;


// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace ThreeDSlicer
{
    /// <summary>
    /// An empty window that can be used on its own or navigated to within a Frame.
    /// </summary>
    public sealed partial class MainWindow : Window
    {
        private readonly ObjToMeshConverterService _objToMeshConverter;
        private readonly CylinderObjectToSvgConverterSevice _cylinderToSvgConverter;
        private readonly CrossSessionSvgBuilder _crossSessionSvgBuilder;
        private bool _rootLoaded;
        private bool _startupMaximized;
        private bool _startupLoadTriggered;

        public MainWindow(ObjToMeshConverterService objToMeshConverter, CylinderObjectToSvgConverterSevice cylinderToSvgConverter, CrossSessionSvgBuilder crossSessionSvgBuilder)
        {
            InitializeComponent();

            var windowHandle = WindowNative.GetWindowHandle(this);
            var windowId = Win32Interop.GetWindowIdFromWindow(windowHandle);
            var appWindow = AppWindow.GetFromWindowId(windowId);

            if (appWindow is not null)
            {
                appWindow.Changed += AppWindow_Changed;
                appWindow.Show();

                if (appWindow.Presenter is OverlappedPresenter overlappedPresenter)
                {
                    overlappedPresenter.Maximize();
                    _startupMaximized = overlappedPresenter.State == OverlappedPresenterState.Maximized;
                }
            }

            _objToMeshConverter = objToMeshConverter;
            _cylinderToSvgConverter = cylinderToSvgConverter;
            _crossSessionSvgBuilder = crossSessionSvgBuilder;

            if (this.Content is FrameworkElement root)
            {
                root.Loaded += Root_Loaded;
            }

            TryLaunchMainWindowLoaded();
        }

        private void Root_Loaded(object sender, RoutedEventArgs e)
        {
            _rootLoaded = true;
            TryLaunchMainWindowLoaded();
        }

        private void AppWindow_Changed(AppWindow sender, AppWindowChangedEventArgs args)
        {
            if (sender is null)
            {
                return;
            }

            if (sender.Presenter is OverlappedPresenter presenter &&
                presenter.State == OverlappedPresenterState.Maximized)
            {
                _startupMaximized = true;
                TryLaunchMainWindowLoaded();
            }
        }

        private void TryLaunchMainWindowLoaded()
        {
            if (_startupLoadTriggered || !_rootLoaded || !_startupMaximized)
            {
                return;
            }

            _startupLoadTriggered = true;
            StartReactApp(this, new RoutedEventArgs());
        }

        private async void StartReactApp(object sender, RoutedEventArgs e)
        {
            var meshObjects = await _objToMeshConverter.Convert();

            try
            {
                if (MainWebView != null)
                {
                    await MainWebView.EnsureCoreWebView2Async();

                    try
                    {
                        var core = MainWebView.CoreWebView2;
                        core.OpenDevToolsWindow();

                        // First try dev server (Vite) at localhost:3000
                        var devUrl = "http://localhost:3000";
                        var devAvailable = false;
                        try
                        {
                            using var http = new HttpClient() { Timeout = TimeSpan.FromMilliseconds(3000) };
                            var res = await http.GetAsync(devUrl);
                            devAvailable = res.IsSuccessStatusCode;
                        }
                        catch (Exception ex)
                        {
                            devAvailable = false;
                        }

                        if (devAvailable)
                        {
                            core.Navigate(devUrl);
                        }
                        else
                        {
                            // Map a virtual host name to the local MainWebApp folder so we can load files with https://appassets/
                            // Resolve repository root relative to the app base directory (bin/Debug/... -> repo root)
                            var exeDir = AppContext.BaseDirectory;
                            var repoRoot = Path.GetFullPath(Path.Combine(exeDir, "..", "..", "..", ".."));
                            var appFolder = Path.Combine(repoRoot, "MainWebApp");
                            if (Directory.Exists(appFolder))
                            {
                                core.SetVirtualHostNameToFolderMapping("appassets", appFolder, CoreWebView2HostResourceAccessKind.Allow);
                                core.Navigate("https://appassets/index.html");
                            }
                            else
                            {
                                // Fallback: try to navigate to file directly if mapping fails
                                var indexPath = Path.Combine(repoRoot, "MainWebApp", "index.html");
                                if (File.Exists(indexPath))
                                {
                                    core.Navigate(new Uri(indexPath).AbsoluteUri);
                                }
                            }
                        }

                        core.WebMessageReceived += async (sender, args) =>
                        {
                            var message = args.TryGetWebMessageAsString();
                            if (string.IsNullOrWhiteSpace(message))
                            {
                                return;
                            }

                            var webViewMessage = JsonConvert.DeserializeObject<WebViewMessage>(message);
                            if (webViewMessage is null)
                            {
                                return;
                            }

                            if (webViewMessage.Type == "app-ready")
                            {
                                var payload = new
                                {
                                    type = "app-ready",
                                    data = new
                                    {
                                        obj = await _objToMeshConverter.GetObjFileContent()
                                    },
                                }
                            ;

                                var jsonPayload = JsonConvert.SerializeObject(payload);
                                core.PostWebMessageAsJson(jsonPayload);

                                return;
                            }

                            if (webViewMessage.Type == "cross-section")
                            {
                                var meshes = meshObjects
                                    .Select(m => _cylinderToSvgConverter.Convert(m, webViewMessage.Axis, webViewMessage.CutPosition))
                                    .Where(m => m != null)
                                    .ToArray();
                                SendSvgToFrontend(core, meshes);
                                return;
                            }
                        };
                    }
                    catch (Exception)
                    {
                        // ignore navigation errors
                    }
                }
            }
            catch (Exception)
            {
                // Initialization failed (WebView2 runtime may be missing)
            }
        }

        private void SendSvgToFrontend(CoreWebView2 core, MeshLoopList[] meshes)
        {
            var svgDocument = _crossSessionSvgBuilder.BuildSvg(meshes);

            var payload = new
            {
                type = "cross-section",
                data = new
                {
                    svg = svgDocument.Element.OuterXml
                }
            };

            var jsonPayload = JsonConvert.SerializeObject(payload);
            core.PostWebMessageAsJson(jsonPayload);
        }

    }
}
