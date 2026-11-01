using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ThreeDSlicer.Application.Features.CrossSessionSvgBuilder;

public static class ServiceRegistration
{
    public static IServiceCollection AddCrossSessionSvgBuilderFeature(this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddSingleton<CrossSessionSvgBuilder>();

        return services;
    }
}
