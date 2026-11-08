using ObjParser;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ThreeDSlicer.Application.Features.IOFile;

namespace ThreeDSlicer.Application.Features.ObjToMeshConverter;

public class ObjToMeshConverterService
{
    private readonly IOFileService _file;

    public ObjToMeshConverterService(IOFileService file)
    {
        _file = file;
    }

    public async Task<List<MeshObject>> Convert()
    {
        var content = await _file.ReadObjFile();
        var contentWitoutComments = content.Where(l => !l.StartsWith("#"));

        var meshesText = string.Join(Environment.NewLine, contentWitoutComments)
            .Split("o ")
            .Where(t => !(string.IsNullOrEmpty(t) || t == "\r\n")).ToList();

        var meshObjects = new List<MeshObject>();
        meshesText.ForEach(t =>
        {
            var meshLines = t.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
            var obj = new Obj();
            obj.VertexListShift = meshObjects.Any() ? meshObjects.Last().Obj.VertexList.Last().Index : 0;
            obj.NormalListShift = meshObjects.Any() ? meshObjects.Last().Obj.NormalList.Last().Index : 0;
            obj.LoadObj(meshLines.Skip(1));

            var objects = GetMeshObjects(obj, meshLines[0], obj.FaceList.First().VertexIndexList.ToList(), new List<MeshObject>());
            meshObjects.AddRange(objects);
        });

        return meshObjects;
    }

    public Task<string> GetObjFileContent()
    {
        return _file.ReadObjFileContent();
    }

    private List<MeshObject> GetMeshObjects(Obj obj, string meshName, List<int> firstFaceVetexIds, List<MeshObject> meshObjects)
    {
        var (objectFacesIds, objectVertsIds) = GetObjectFaces(obj,
            firstFaceVetexIds,
            new List<int>());

        var meshObject = new MeshObject
        {
            Name = meshName,
            Obj = obj,
            Verts = obj.VertexList.Where(v => objectVertsIds.Contains(v.Index)).ToArray(),
            Faces = obj.FaceList.Where(f => objectFacesIds.Contains(f.Id)).ToArray(),
            Size = obj.Size,
        };

        meshObjects.Add(meshObject);

        var otherFaces = obj.FaceList.Except(meshObjects.SelectMany(mo => mo.Faces).ToList());

        if (otherFaces.Any())
        {
            GetMeshObjects(obj, meshName, otherFaces.First().VertexIndexList.ToList(), meshObjects);
        }

        return meshObjects;
    }

    private (List<int> faceIds, List<int> vertIds) GetObjectFaces(Obj obj, List<int> vertIds, List<int> faceIds)
    {
        var neighbourFaces = obj.FaceList
            .Where(f => !faceIds.Contains(f.Id) && f.VertexIndexList.Intersect(vertIds).Any())
            .ToList();

        if (neighbourFaces.Any())
        {
            var neighbourFacesVertIds = neighbourFaces.SelectMany(f => f.VertexIndexList).Distinct().ToList();
            var newVerts = neighbourFacesVertIds.Except(vertIds);
            vertIds.AddRange(newVerts);
            faceIds.AddRange(neighbourFaces.Select(f => f.Id).ToList());
            GetObjectFaces(obj, vertIds, faceIds);
        }

        return (faceIds, vertIds);
    }
}
