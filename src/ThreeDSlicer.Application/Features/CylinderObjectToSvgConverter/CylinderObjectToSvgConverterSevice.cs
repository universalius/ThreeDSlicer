using ThreeDSlicer.Application.Enums;
using ThreeDSlicer.Application.Features.IOFile;
using ThreeDSlicer.Application.Features.ObjToMeshConverter;
using ThreeDSlicer.Application.Helpers;
using GeometRi;
using Microsoft.Extensions.Logging;
using ObjParser;
using SvgLib;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter;

public class CylinderObjectToSvgConverterSevice(IOFileService fileService, ILogger<CylinderObjectToSvgConverterSevice> logger)
{
    public Point3d[] Convert(MeshObject meshObject, Axises cutPlane, int? cutPlaneRelPos = 50)
    {
        var size = meshObject.Size;
        var points = meshObject.Verts.Select(v => new { Id = v.Index, Point = new Point3d(v.X, v.Y, v.Z) }).ToArray();
        var boxCenter = new Point3d(
            meshObject.Size.XMin + (meshObject.Size.XMax - meshObject.Size.XMin) / 2,
            meshObject.Size.YMin + (meshObject.Size.YMax - meshObject.Size.YMin) / 2,
            meshObject.Size.ZMin + (meshObject.Size.ZMax - meshObject.Size.ZMin) / 2);

        var axisCutPlanes = new[]
        {
            new { Axis = Axises.YZ, Plane = new Plane3d(GetAxisCutPlaneCenter(meshObject.Size, Axises.YZ, cutPlaneRelPos, boxCenter), new Vector3d(1.0, 0.0, 0.0)) },
            new { Axis = Axises.XZ, Plane = new Plane3d(GetAxisCutPlaneCenter(meshObject.Size, Axises.XZ, cutPlaneRelPos, boxCenter), new Vector3d(0.0, 1.0, 0.0)) },
            new { Axis = Axises.XY, Plane = new Plane3d(GetAxisCutPlaneCenter(meshObject.Size, Axises.XY, cutPlaneRelPos, boxCenter), new Vector3d(0.0, 0.0, 1.0)) },
        };

        var facePlanes = meshObject.Faces
        .Select(f =>
        {
            var facePoints = points.Where(p => f.VertexIndexList.Contains(p.Id))
            .ToArray();
            var faceEdgePoints = f.VertexIndexList.Select(id => facePoints.First(p => p.Id == id).Point).ToArray();

            var plane = new Plane3d(faceEdgePoints[0], faceEdgePoints[1], faceEdgePoints[2]);

            //if (f.Id == 379)
            //{
            //    var a = 1;
            //}

            return new { Face = f, Plane = plane, Edges = faceEdgePoints.ToSegments(), Points = faceEdgePoints };
        })
        .ToList();

        var d = new List<object>();
        var acp = axisCutPlanes.FirstOrDefault(i => i.Axis == cutPlane);
        var crossCurveEdges = facePlanes.Select(fp =>
        {
            if (fp.Points.Length == 3)
            {
                var a = boxCenter;
                var b = acp.Plane.Point;
                var intersection1 = acp.Plane.IntersectionWith(fp.Plane);
            }

            if (fp.Face.Id == 1)
            {
                var a = fp.Points;
                var b = acp.Plane.Point;
            }

            var targetEdges = fp.Edges.Where(e => e.IsCutByOrthogonalPlane(acp.Plane, acp.Axis)).ToArray();
            if (targetEdges.Length == 0)
            {
                return null;
            }

            var crossPoints = targetEdges
                .SelectMany<Segment3d, Point3d>(e =>
                {
                    var intersection = acp.Plane.IntersectionWith(e.ToLine);
                    if (intersection is Line3d)
                    {
                        return [e.P1, e.P2];
                    }

                    return [intersection as Point3d];
                })
                .Where(p => p != null && IsInsideBox(p, size))
                .GroupBy(p => (
                    Math.Round(p.X, 6),
                    Math.Round(p.Y, 6),
                    Math.Round(p.Z, 6)))
                .Select(g => g.First())
                .ToArray();

            if (crossPoints.Length == 1)
            {
                return null;
            }

            return new { FacePlane = fp, CrossPoints = crossPoints };
        })
        .Where(cp => cp != null)
        .ToArray();

        var svgDocument = SvgDocument.Create();
        svgDocument.Units = "mm";

        foreach (var item in crossCurveEdges)
        {
            var p1 = item.CrossPoints[0].ChangeAxises(cutPlane);
            var p2 = item.CrossPoints[1].ChangeAxises(cutPlane);

            var line = svgDocument.AddLine();
            line.X1 = p1.X;
            line.Y1 = p1.Y;
            line.X2 = p2.X;
            line.Y2 = p2.Y;
            line.SetStyle("stroke-width", "1");
            line.SetStyle("stroke", "red");

            var midX = (p1.X + p2.X) / 2d;
            var midY = (p1.Y + p2.Y) / 2d;

            var faceText = svgDocument.AddText();
            faceText.X = midX;
            faceText.Y = midY;
            faceText.FontSize = 2;
            faceText.Fill = "black";
            faceText.TextAnchor = SvgTextAnchor.Middle;
            faceText.Text = item.FacePlane.Face.Id.ToString();
        }

        fileService.SaveSvg($"{cutPlane.ToString()}_cross_slice_lined_debug", svgDocument.Element.OuterXml);








        var profileCurveEdges = crossCurveEdges.Select(cce => new CrossEdge(cce.FacePlane.Face.Id, cce.CrossPoints.ToSegments(false)[0], cce.FacePlane.Points)).ToArray();
        var profileCurvePoints = GetCrossEdgePoints(profileCurveEdges, profileCurveEdges[0], new List<Point3d>()).ToArray();

        var svgDocument1 = SvgDocument.Create();
        svgDocument1.Units = "mm";
        var path = svgDocument1.AddPath();
        path.D = profileCurvePoints.ToPathString(cutPlane);
        path.SetStyle("stroke-width", "1");
        path.SetStyle("stroke", "red");
        path.SetStyle("fill", "none");

        fileService.SaveSvg($"{cutPlane.ToString()}_cross_slice", svgDocument1.Element.OuterXml);

        return profileCurvePoints
            .Select(p => p.ChangeAxises(cutPlane)).ToArray();
    }

    private static Point3d GetAxisCutPlaneCenter(Extent size, Axises axis, int? relativePosition, Point3d defaultCenter)
    {
        if (relativePosition is null)
        {
            return defaultCenter;
        }

        var ratio = Math.Clamp(relativePosition.Value, 0, 100) / 100d;

        return axis switch
        {
            Axises.YZ => new Point3d(
                size.XMin + (size.XMax - size.XMin) * ratio,
                defaultCenter.Y,
                defaultCenter.Z),
            Axises.XZ => new Point3d(
                defaultCenter.X,
                size.YMin + (size.YMax - size.YMin) * ratio,
                defaultCenter.Z),
            Axises.XY => new Point3d(
                defaultCenter.X,
                defaultCenter.Y,
                size.ZMin + (size.ZMax - size.ZMin) * ratio),
            _ => defaultCenter,
        };
    }

    private IEnumerable<Point3d> GetCrossEdgePoints(IEnumerable<CrossEdge> crossEdges,
        CrossEdge targetCrossEdge,
        List<Point3d> profileCurvePoints)
    {
        var c = crossEdges.Select(ce => ce.Edge).ToArray();


        var processedFaceIds = new List<int> { targetCrossEdge.FaceId };
        var targetEdge = targetCrossEdge.Edge;

        if (profileCurvePoints.Count == 0)
        {
            profileCurvePoints.AddRange([targetEdge.P1, targetEdge.P2]);
        }
        else
        {
            profileCurvePoints.Add(targetEdge.P2);
        }


        var itemsWithSameEdge = crossEdges.Where(pce => pce.FaceId != targetCrossEdge.FaceId &&
              pce.Edge == targetEdge).ToArray();

        if (itemsWithSameEdge.Length > 0)
        {
            var a = 0;
        }

        processedFaceIds.AddRange(itemsWithSameEdge.Select(i => i.FaceId).ToArray());

        var notProcessedCrossEdges = crossEdges
            .Where(ce => !processedFaceIds.Contains(ce.FaceId))
            .ToArray();

        var nextEdge = notProcessedCrossEdges.FirstOrDefault(ce =>
            PointEquals(ce.Edge.P1, targetEdge.P2) ||
            PointEquals(ce.Edge.P2, targetEdge.P1) ||
            PointEquals(ce.Edge.P1, targetEdge.P1) ||
            PointEquals(ce.Edge.P2, targetEdge.P2)
            );

        //if (targetCrossEdge.FaceId == 508)
        //{
        //    var d = notProcessedCrossEdges.FirstOrDefault(i => i.FaceId == targetCrossEdge.FaceId + 1);
        //    var a = PointEquals(d.Edge.P1, targetEdge.P2);
        //    var b = PointEquals(d.Edge.P2, targetEdge.P1);
        //    var c = PointEquals(d.Edge.P1, targetEdge.P1);
        //    var e = PointEquals(d.Edge.P2, targetEdge.P2);
        //}

        if (nextEdge != null)
        {
            if (PointEquals(nextEdge.Edge.P1, targetEdge.P2))
            {
                var d = 0;
            }

            if (!PointEquals(nextEdge.Edge.P1, targetEdge.P2))
            {
                nextEdge = new CrossEdge(nextEdge.FaceId, new Segment3d(nextEdge.Edge.P2, nextEdge.Edge.P1), nextEdge.Points);
            }

            GetCrossEdgePoints(notProcessedCrossEdges, nextEdge, profileCurvePoints);
        }

        return profileCurvePoints.Distinct();
    }

    private bool PointEquals(Point3d p1, Point3d p2)
    {
        return p1.DistanceTo(p2) <= 0.0001;
    }

    private bool IsInsideBox(Point3d point, Extent box)
    {
        return point.X >= box.XMin && point.X <= box.XMax &&
               point.Y >= box.YMin && point.Y <= box.YMax &&
               point.Z >= box.ZMin && point.Z <= box.ZMax;
    }

    private record CrossEdge(int FaceId, Segment3d Edge, Point3d[] Points);
}


