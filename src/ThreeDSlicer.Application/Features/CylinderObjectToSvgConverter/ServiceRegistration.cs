using _3DObjectToGCode.Application.Features.IOFile;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace _3DObjectToGCode.Application.Features.CylinderObjectToSvgConverter;

public static class ServiceRegistration
{
    public static IServiceCollection AddCylinderObjectToSvgConverterFeature(this IServiceCollection services,
       IConfiguration configuration)
    {
        services
            .AddSingleton<CylinderObjectToSvgConverterSevice>();

        services
            .AddIOFileFeature(configuration);

        return services;
    }
}