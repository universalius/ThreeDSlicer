using GeometRi;
using Microsoft.UI;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.Web.WebView2.Core;
using Newtonsoft.Json;
using SvgLib;
using System;
using System.IO;
using System.Net.Http;
using ThreeDSlicer.Application.Enums;
using ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter;
using ThreeDSlicer.Application.Features.ObjToMeshConverter;
using ThreeDSlicer.Application.Helpers;
using ThreeDSlicer.Application.Helpers.GeometryHelpers;
using ThreeDSlicer.Application.Models;
using WinRT.Interop;


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
        private bool _rootLoaded;
        private bool _startupMaximized;
        private bool _startupLoadTriggered;

        public MainWindow(ObjToMeshConverterService objToMeshConverter, CylinderObjectToSvgConverterSevice cylinderToSvgConverter)
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
            var meshObject = await _objToMeshConverter.Convert();
            var profilePoints = _cylinderToSvgConverter.Convert(meshObject, Axises.XY);

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

                        core.WebMessageReceived += (sender, args) =>
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
                                SendSvgToFrontend(core, profilePoints);
                                return;
                            }

                            if (webViewMessage.Type == "cross-section")
                            {
                                var requestPoints = _cylinderToSvgConverter.Convert(meshObject, webViewMessage.Axis, webViewMessage.CutPosition);
                                SendSvgToFrontend(core, requestPoints);
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
    
        private void SendSvgToFrontend(CoreWebView2 core, Point3d[] points)
        {
            var svgDocument = BuildSvg(points);

            var payload = new
            {
                type = "svg-data",
                svg = svgDocument.Element.OuterXml
            };

            var jsonPayload = JsonConvert.SerializeObject(payload);
            core.PostWebMessageAsJson(jsonPayload);
        }

        private SvgDocument BuildSvg(Point3d[] profilePoints)
        {
            var bounds = profilePoints.GetPolygonBounds();

            var xMin = bounds.XMin > 0 ? bounds.XMin + 5 : bounds.XMin - 5;
            var yMin = bounds.YMin > 0 ? bounds.YMin + 5 : bounds.YMin - 5;

            var svgDocument = SvgDocument.Create();
            svgDocument.Units = "%";
            svgDocument.ViewBox = new SvgViewBox(xMin, yMin, bounds.Width + 2 * 5, bounds.Height);
            svgDocument.Width = 100;
            svgDocument.Height = 100;

            var path = svgDocument.AddPath();
            path.D = profilePoints.ToPathString();
            path.SetStyle("stroke-width", "1");
            path.SetStyle("stroke", "red");
            path.SetStyle("fill", "url(#hatch-45)");

            var defs = svgDocument.AddDefs();
            var pattern = defs.AddPattern();
            pattern.Id = "hatch-45";
            pattern.Width = 10;
            pattern.Height = 10;
            pattern.PatternUnits = "userSpaceOnUse";

            var line = pattern.AddLine();
            line.X1 = 0;
            line.Y1 = 0;
            line.X2 = 20;
            line.Y2 = 20;
            line.SetStyle("stroke", "red");
            line.SetStyle("stroke-width", "0.5");
            line.SetStyle("stroke-linecap", "square");

            return svgDocument;
        }
    }
}
