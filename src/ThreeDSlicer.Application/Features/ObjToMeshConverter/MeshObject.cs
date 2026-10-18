using ObjParser;
using ObjParser.Types;
using System.Collections.Generic;

namespace ThreeDSlicer.Application.Features.ObjToMeshConverter;

public class MeshObject
{
    public IEnumerable<Vertex> Verts { get; set; }
    public IEnumerable<Face> Faces { get; set; }
    public Extent Size { get; set; }
    public string Axis { get; set; }
}
