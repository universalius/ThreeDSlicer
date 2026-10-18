using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ThreeDSlicer.Application.Features.IOFile;

namespace ThreeDSlicer.Application.Features.ObjToMeshConverter;

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