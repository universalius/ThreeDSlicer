using _3DObjectToGCode.Application.Features.IOFile;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace _3DObjectToGCode.Application.Features.ObjToMeshConverter;

public static class ServiceRegistration
{
    public static IServiceCollection AddObjToMeshConverterFeature(this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddSingleton<ObjToMeshConverterService>();

        services
            .AddIOFileFeature(configuration);

        return services;
    }
}