using Flat3DObjectsToSvgConverter.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;

namespace _3DObjectToGCode.Application.Features.IOFile;

public static class ServiceRegistration
{
    public static IServiceCollection AddIOFileFeature(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddSingleton<IOFileService>();

        services
            .AddOptions()
            .Configure<IOSettings>(configuration.GetSection("IO"));

        return services;
    }
}