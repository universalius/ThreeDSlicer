using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using Microsoft.Web.WebView2.Core;
using SvgLib;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Text.Json;
using System.Threading.Tasks;
using ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter;
using ThreeDSlicer.Application.Features.ObjToMeshConverter;
using Windows.Foundation;
using Windows.Foundation.Collections;
using ThreeDSlicer.Application.Helpers;


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

        public MainWindow(ObjToMeshConverterService objToMeshConverter, CylinderObjectToSvgConverterSevice cylinderToSvgConverter)
        {
            InitializeComponent();

            _objToMeshConverter = objToMeshConverter;
            _cylinderToSvgConverter = cylinderToSvgConverter;

            if (this.Content is FrameworkElement root)
            {
                root.Loaded += MainWindow_Loaded;
            }
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            var meshObject = await _objToMeshConverter.Convert();
            var (profilePoints, axis) = _cylinderToSvgConverter.Convert(meshObject);

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
                            using var http = new HttpClient() { Timeout = TimeSpan.FromMilliseconds(800) };
                            var res = await http.GetAsync(devUrl);
                            devAvailable = res.IsSuccessStatusCode;
                        }
                        catch
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
                            if (message != "{\"type\":\"app-ready\"}")
                            {
                                return;
                            }

                            var svgDocument = SvgDocument.Create();
                            svgDocument.Units = "mm";

                            var path = svgDocument.AddPath();
                            path.D = profilePoints.ToArray().ToPathString(axis);
                            path.SetStyle("stroke-width", "1");
                            path.SetStyle("stroke", "red");
                            path.SetStyle("fill", "none");

                            var payload = new
                            {
                                type = "initial-data",
                                svg = svgDocument.Element.OuterXml
                            };

                            var jsonPayload = JsonSerializer.Serialize(payload);
                            core.PostWebMessageAsJson(jsonPayload);
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
    }
}
