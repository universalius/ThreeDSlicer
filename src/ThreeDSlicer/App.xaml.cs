using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using Microsoft.UI.Xaml.Shapes;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.ApplicationModel;
using Windows.ApplicationModel.Activation;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using _3DObjectToGCode.Application.Features.ObjToMeshConverter;
using _3DObjectToGCode.Application.Features.CylinderObjectToSvgConverter;

// To learn more about WinUI, the WinUI project structure,
// and more about our project templates, see: http://aka.ms/winui-project-info.

namespace ThreeDSlicer
{
    /// <summary>
    /// Provides application-specific behavior to supplement the default Application class.
    /// </summary>
    public partial class App : Application
    {
        private Window? _window;
        public static IHost? AppHost { get; private set; }
        public static IServiceProvider Services => AppHost!.Services;

        /// <summary>
        /// Initializes the singleton application object.  This is the first line of authored code
        /// executed, and as such is the logical equivalent of main() or WinMain().
        /// </summary>
        public App()
        {
            InitializeComponent();

            // Build a generic host and register application services
            AppHost = Host.CreateDefaultBuilder()
                .ConfigureAppConfiguration((context, config) =>
                {
                    // Load optional appsettings.json from the app base directory
                    config.SetBasePath(AppContext.BaseDirectory)
                          .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false);
                })
                .ConfigureServices((context, services) =>
                {
                    // Register features from ThreeDSlicer.Application using the host configuration
                    services.AddObjToMeshConverterFeature(context.Configuration);
                    services.AddCylinderObjectToSvgConverterFeature(context.Configuration);
                })
                .Build();

            // Ensure we stop the host when the app is suspending (CoreApplication.Suspending used for WinUI3 desktop)
            Windows.ApplicationModel.Core.CoreApplication.Suspending += App_Suspending;
        }

        /// <summary>
        /// Invoked when the application is launched.
        /// </summary>
        /// <param name="args">Details about the launch request and process.</param>
        protected override async void OnLaunched(Microsoft.UI.Xaml.LaunchActivatedEventArgs args)
        {
            try
            {
                if (AppHost != null)
                {
                    // Start the host so hosted services (if any) begin running
                    await AppHost.StartAsync();
                }
            }
            catch
            {
                // ignore host start errors for now
            }

            // Resolve feature services from the host and inject into the MainWindow
            var objConverter = Services.GetRequiredService<ObjToMeshConverterService>();
            var cylinderConverter = Services.GetRequiredService<CylinderObjectToSvgConverterSevice>();
            _window = new MainWindow(objConverter, cylinderConverter);

            // Stop the host when the main window is closed to ensure graceful shutdown
            _window.Closed += async (s, e) =>
            {
                if (AppHost != null)
                {
                    try
                    {
                        await AppHost.StopAsync();
                    }
                    catch
                    {
                        // ignore
                    }
                    AppHost.Dispose();
                }
            };

            _window.Activate();
        }

        private async void App_Suspending(object sender, Windows.ApplicationModel.SuspendingEventArgs e)
        {
            var def = e.SuspendingOperation.GetDeferral();
            try
            {
                if (AppHost != null)
                {
                    try
                    {
                        await AppHost.StopAsync();
                    }
                    catch
                    {
                        // ignore
                    }
                    AppHost.Dispose();
                }
            }
            finally
            {
                def.Complete();
            }
        }
    }
}
