using GeometRi;
using ObjParser.Types;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ThreeDSlicer.Application.Enums;

namespace ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter.Models;

public record MeshVertex(int Id, Point3d Point);

public record AxisCutPlane(Axises Axis, Plane3d Plane);

public record FaceSection(Face Face, Plane3d Plane, Segment3d[] Edges, Point3d[] Points);

public record CrossSection(FaceSection FacePlane, Point3d[] CrossPoints);

public record CrossEdge(int FaceId, Segment3d Edge, Point3d[] Points);

public record MeshLoop(Point3d[] Main, IEnumerable<Point3d[]> Holes = null);
