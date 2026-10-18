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
    public IEnumerable<Point3d> Convert(MeshObject meshObject)
    {
        //var rect = new[] { new Point3d(1.0, 1.0, 1.0), new Point3d(1.0, 5.0, 1.0), new Point3d(4.0, 5.0, 1.0), new Point3d(4.0, 1.0, 1.0), new Point3d(1.0, 1.0, 1.0) };
        //var a = new Plane3d(rect[0], rect[1], rect[2]);

        //var b = new Plane3d(new Point3d(2.0, 0.0, 0.0), new Vector3d(1.0, 0.0, 0.0));

        //var intersection = b.IntersectionWith(a) as Line3d;

        //var crossPoints = rect.ToSegments()
        //                .Select(e => intersection.IntersectionWith(e) as Point3d)
        //                //.Where(p => p != null)
        //                .ToArray();


        //var triangle = new Triangle(rect[0], rect[1], rect[2]);
        //b.IntersectionWith(triangle);

        //return null;
        var size = meshObject.Size;
        var points = meshObject.Verts.Select(v => new { Id = v.Index, Point = new Point3d(v.X, v.Y, v.Z) }).ToArray();
        var boxCenter = new Point3d(
            meshObject.Size.XMin + (meshObject.Size.XMax - meshObject.Size.XMin) / 2,
            meshObject.Size.YMin + (meshObject.Size.YMax - meshObject.Size.YMin) / 2,
            meshObject.Size.ZMin + (meshObject.Size.ZMax - meshObject.Size.ZMin) / 2);

        var axisCutPlanes = new[]
        {
            new { Axis = Axises.YZ, Plane = new Plane3d(boxCenter, new Vector3d(1.0, 0.0, 0.0))},
            new { Axis = Axises.XZ, Plane = new Plane3d(boxCenter, new Vector3d(0.0, 1.0, 0.0))},
            new { Axis = Axises.XY, Plane = new Plane3d(boxCenter, new Vector3d(0.0, 0.0, 1.0))},
        };

        var facePlanes = meshObject.Faces
        .Select(f =>
        {
            var facePoints = points.Where(p => f.VertexIndexList.Contains(p.Id))
            .ToArray();
            var faceEdgePoints = f.VertexIndexList.Select(id => facePoints.First(p => p.Id == id).Point).ToArray();

            var plane = new Triangle(faceEdgePoints[0], faceEdgePoints[1], faceEdgePoints[2]);

            //if (f.Id == 379)
            //{
            //    var a = 1;
            //}

            return new { Face = f, Plane = plane, Edges = faceEdgePoints.ToSegments() };
        })
        .ToList();

        var count = 0;
        var d = new List<object>();
        var axisCrossCurvePoints = axisCutPlanes.Select(acp =>
        {
            var crossCurveEdges = facePlanes.Select(fp =>
            {
                var intersection = acp.Plane.IntersectionWith(fp.Plane);
                if (intersection != null)
                {
                    var targetEdges = fp.Edges.Where(e => e.IsAxisPlaneCuted(acp.Plane, acp.Axis)).ToArray();

                    var crossPoints = targetEdges
                        .Select(e => acp.Plane.IntersectionWith(e.ToLine) as Point3d)
                        .Where(p => p != null && IsInsideBox(p, size))
                        .ToArray();

                    //var crossPoints1 = fp.Edges
                    //   .Select(e => acp.Plane.IntersectionWith(e.ToLine))
                    //   .ToArray();

                    //if (fp.Face.Id == 0 && acp.Axis == Axises.XZ)
                    //{
                    //    var a = 1;
                    //}


                    //if (acp.Axis == Axises.XY)
                    //{
                    //    d.Add(intersection);
                    //    count++;
                    //}

                    //if (acp.Axis == Axises.YZ && crossPoints.Length > 2)
                    //{
                    //    var b = 0;
                    //}

                    return new { FacePlane = fp, CrossPoints = crossPoints };
                }

                return null;
            })
            .Where(cp => cp != null)
            .ToArray();

            return new { Axis = acp.Axis, CrossCurveEdges = crossCurveEdges };
        })
        .ToArray();

        var circleCurves = axisCrossCurvePoints.Select(i =>
        {
            var isCircle = false;
            if (i.CrossCurveEdges.Count() < 3)
            {
                return new { i.Axis, i.CrossCurveEdges, IsCircle = isCircle };
            }

            Circle3d circle;
            try
            {
                var points = i.CrossCurveEdges.SelectMany(cce => cce.CrossPoints).Distinct().ToArray();
                circle = new Circle3d(points[0], points[1], points[2]);
                var distancesToCenter = points.Select(p => p.DistanceTo(circle.Center) - circle.R).ToArray();
                isCircle = distancesToCenter.All(d => d < 0.1);
            }
            catch (Exception ex)
            {

            }

            return new { i.Axis, i.CrossCurveEdges, IsCircle = isCircle };
        })
        .ToArray();

        var targetProfileCurve = circleCurves.FirstOrDefault(cc => !cc.IsCircle);
        var profileCurveEdges = targetProfileCurve.CrossCurveEdges
            .Select(cce => new CrossEdge(cce.FacePlane.Face.Id, cce.CrossPoints.ToSegments(false)[0])).ToArray();

        var profileCurvePoints = GetCrossEdgePoints(profileCurveEdges, profileCurveEdges[0], new List<Point3d>()).ToArray();

        var svgDocument = SvgDocument.Create();
        svgDocument.Units = "mm";
        var path = svgDocument.AddPath();
        path.D = profileCurvePoints.ToPathString(targetProfileCurve.Axis);
        path.SetStyle("stroke-width", "1");
        path.SetStyle("stroke", "red");
        path.SetStyle("fill", "none");

        fileService.SaveSvg($"{targetProfileCurve.Axis.ToString()}_cross_slice", svgDocument.Element.OuterXml);

        return profileCurvePoints
            .Select(p => p.ChangeAxises(targetProfileCurve.Axis)).ToArray();
    }

    private IEnumerable<Point3d> GetCrossEdgePoints(IEnumerable<CrossEdge> crossEdges,
        CrossEdge targetCrossEdge,
        List<Point3d> profileCurvePoints)
    {
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
            if (!PointEquals(nextEdge.Edge.P1, targetEdge.P2))
            {
                nextEdge = new CrossEdge(nextEdge.FaceId, new Segment3d(nextEdge.Edge.P2, nextEdge.Edge.P1));
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

    private record CrossEdge(int FaceId, Segment3d Edge);
}


