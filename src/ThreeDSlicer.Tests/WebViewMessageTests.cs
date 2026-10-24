using Newtonsoft.Json;
using ThreeDSlicer.Application.Enums;
using ThreeDSlicer.Application.Models;
using Xunit;

namespace ThreeDSlicer.Tests;

public class WebViewMessageTests
{
    [Fact]
    public void Deserialize_Parses_Type_And_Axis_Enum()
    {
        const string json = "{\"type\":\"cross-section\",\"axis\":2}";

        var result = JsonConvert.DeserializeObject<WebViewMessage>(json);

        Assert.NotNull(result);
        Assert.Equal("cross-section", result!.Type);
        Assert.Equal(Axises.YZ, result.Axis);
    }
}
