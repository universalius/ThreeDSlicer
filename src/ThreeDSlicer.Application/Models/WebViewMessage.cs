using ThreeDSlicer.Application.Enums;

namespace ThreeDSlicer.Application.Models;

public class WebViewMessage
{
    public string Type { get; set; } = string.Empty;
    public Axises Axis { get; set; }
    public int? CutPosition { get; set; }
}
