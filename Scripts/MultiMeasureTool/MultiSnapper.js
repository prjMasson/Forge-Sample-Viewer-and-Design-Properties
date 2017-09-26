AutodeskNamespace('Autodesk.Viewing.Extensions.MultiMeasureTool');

var SNAP_VERTEX = 0;
var SNAP_EDGE = 1;
var SNAP_FACE = 2;
var SNAP_CIRCULARARC = 3;
var SNAP_CURVEDEDGE = 4;
var SNAP_CURVEDFACE = 5;
var SNAP_PRECISION = 0.001;

//
// /** @constructor */
//
//
Autodesk.Viewing.Extensions.MultiMeasureTool.Snapper = function (viewer) {

    var _viewer = viewer;

    var _names = ["snapper"];
    var _active = false;

    var _faceOverlayName = 'MeasureTool-snapper-face';
    var _vertexOverlayName = 'MeasureTool-snapper-vertex';
    var _edgeOverlayName = 'MeasureTool-snapper-edge';

    var _radius = null;
    var _distanceToEdge = Number.MAX_VALUE;
    var _distanceToVertex = null;

    var _geomFace = null;
    var _geomEdge = null;
    var _geomVertex = null;
    var _snapNode = null;

    var _geomHighlighted = null; //  {"VERTEX": 0, "EDGE": 1, "FACE": 2}

    var _intersectPoint = null;
    var _faceNormal = null;

    var _isDragging = false;

    var _isSnapped = false;

    var _viewportIndex2d = null;

    var _circularArcCenter = null;
    var _circularArcRadius = null;

    var _clip = null;
    var _firstClickVpId = null; // the viewport index of the first selection for 2D

    this.isActive = function() {
        return _active;
    };

    this.getNames = function() {
        return _names;
    };

    this.getName = function() {
        return _names[0];
    };

    this.activate = function() {
        _active = true;
    };

    this.deactivate = function() {
        _active = false;
        this.destroy();
    };

    this.getFace = function() {
        return _geomFace;
    };

    this.getEdge = function() {
        return _geomEdge;
    };

    this.getVertex = function() {
        return _geomVertex;
    };

    this.getGeometry = function() {

        switch (_geomHighlighted) {

            case SNAP_VERTEX: return this.getVertex(); break;
            case SNAP_EDGE: return this.getEdge(); break;
            case SNAP_FACE: return this.getFace(); break;
            case SNAP_CIRCULARARC: return this.getEdge(); break;
            case SNAP_CURVEDEDGE: return this.getEdge(); break;
            case SNAP_CURVEDFACE: return this.getFace(); break;
            default: break;
        }
    };

    this.getSnapNode = function() {
        return _snapNode;
    };

    this.getHighlightGeometry = function() {
        return _geomHighlighted;
    };

    this.getIntersectPoint = function() {
        return _intersectPoint;
    };

    this.getFaceNormal = function() {
        return _faceNormal;
    };

    this.getEndPointsInEdge = function(edge) {

        var vertices = edge.vertices;
        var endPoints = [];

        for (var i = 0; i < vertices.length; ++i) {

            var duplicate = false;

            for (var j = 0; j < vertices.length; ++j) {

                if (j !== i && vertices[j].equals(vertices[i])) {

                    duplicate = true;
                    break;
                }
            }

            if (!duplicate) {

                endPoints.push(vertices[i]);

            }
        }

        return endPoints;
    };

    this.getViewportIndex = function() {
        return _viewportIndex2d;
    };

    this.getCircularArcCenter = function() {
        return _circularArcCenter;
    };

    this.getCircularArcRadius = function() {
        return _circularArcRadius;
    };

    this.getDetectRadius = function() {
        return _radius;
    };

    this.isSnapped = function() {
        return _isSnapped;
    };

    this.setClip = function(clip) {
        _clip = clip;
    };

    this.setFirstClickVpId = function(vpId) {
        _firstClickVpId = vpId;
    };

    this.isEqualWithPrecision = function(a, b) {

        if (Math.abs(a - b) <= SNAP_PRECISION) {
            return true;
        }

        return false;
    };

    this.isEqualVectorsWithPrecision = function(v1, v2) {

        if (Math.abs(v1.x - v2.x) <= SNAP_PRECISION && Math.abs(v1.y - v2.y) <= SNAP_PRECISION && Math.abs(v1.z - v2.z) <= SNAP_PRECISION) {

            return true;
        }

        return false;
    };

    this.isInverseVectorsWithPrecision = function(v1, v2) {

        if (Math.abs(v1.x + v2.x) <= SNAP_PRECISION && Math.abs(v1.y + v2.y) <= SNAP_PRECISION && Math.abs(v1.z + v2.z) <= SNAP_PRECISION) {

            return true;
        }

        return false;
    };

    /**
     * 3D Snapping
     * @param result -Result of Hit Test.
     */
    this.snapping3D = function(result) {

        _snapNode = result.dbId;

        var face = result.face;
        _intersectPoint = result.intersectPoint;
        var fragIds;

        if (result.fragId.length === undefined) {
            fragIds = [result.fragId];
        } else {
            fragIds = result.fragId;
        }

        // This is for Fusion model with topology data
        if (_viewer.model.hasTopology()) {

            // Because edge topology data may be in other fragments with same dbId, need to iterate all of them.
            if (_snapNode) {
                fragIds = [];

                _viewer.model.getData().instanceTree.enumNodeFragments(_snapNode, function(fragId) {
                    fragIds.push(fragId);
                }, true);
            }

            _geomFace = _geomEdge = _geomVertex = null;
            _distanceToEdge = Number.MAX_VALUE;

            for (var fi = 0; fi < fragIds.length; ++fi) {

                var fragId = fragIds[fi];
                var mesh = _viewer.impl.getRenderProxy(_viewer.model, fragId);
                var geometry = mesh.geometry;

                var topoIndex = _viewer.model.getTopoIndex(fragId);
                var topology = _viewer.model.getTopology(topoIndex);
                var facesTopology = topology.faces;
                var edgesTopology = topology.edges;
                var verticesTopology = topology.vertices;

                if (!_geomFace) {
                    _geomFace = this.faceSnappingWithTopology(face, geometry, facesTopology, mesh);

                    if (_geomFace) {
                        _geomFace.fragId = fragId;
                    }

                    var normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
                    _faceNormal = face.normal.applyMatrix3(normalMatrix).normalize();
                }

                // Need to iterate all frags with same dbId, because when meshes are attached with each other, edges topology data will only be on one mesh.
                this.edgeSnappingWithTopology(_intersectPoint, geometry, edgesTopology, mesh);

            }

            _geomVertex = this.vertexSnappingWithTopology(_geomEdge, _intersectPoint);

            if (_geomFace) {

                // Determine which one should be drawn: face , edge or vertex
                _radius = this.setDetectRadius(_intersectPoint);

                if (_distanceToVertex < _radius) {

                    this.drawPoint(_geomVertex);
                    _geomHighlighted = SNAP_VERTEX;

                }
                else if (_distanceToEdge < _radius) {

                    this.drawLine(_geomEdge);

                    var center = this.edgeIsCircle(_geomEdge);
                    if (center) {
                        _circularArcCenter = center;
                        _circularArcRadius = center.distanceTo(_geomEdge.vertices[0]);
                        _geomHighlighted = SNAP_CIRCULARARC;
                    }
                    else if (this.edgeIsCurved(_geomEdge)) {
                        _geomHighlighted = SNAP_CURVEDEDGE;
                    }
                    else {
                        _geomHighlighted = SNAP_EDGE;
                    }

                }
                else {

                    this.drawFace(_geomFace);

                    if (this.faceIsCurved(_geomFace)) {
                        _geomHighlighted = SNAP_CURVEDFACE;
                    }
                    else {
                        _geomHighlighted = SNAP_FACE;
                    }

                }
                
                _isSnapped = true;
            }
        }
        else {

            for (var fi = 0; fi < fragIds.length; ++fi) {

                var fragId = fragIds[fi];
                var mesh = _viewer.impl.getRenderProxy(_viewer.model, fragId);
                var geometry = mesh.geometry;

                _geomFace = this.faceSnapping(face, geometry);

                if (_geomFace) {

                    _geomFace.applyMatrix(mesh.matrixWorld);
                    _geomEdge = this.edgeSnapping(_geomFace, _intersectPoint);
                    _geomVertex = this.vertexSnapping(_geomEdge, _intersectPoint);

                    var normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
                    _faceNormal = face.normal.applyMatrix3(normalMatrix).normalize();

                    // Determine which one should be drawn: face , edge or vertex
                    _radius = this.setDetectRadius(_intersectPoint);

                    if (_distanceToVertex < _radius) {

                        this.drawPoint(_geomVertex);
                        _geomHighlighted = SNAP_VERTEX;

                    }
                    else if (_distanceToEdge < _radius) {

                        this.drawLine(_geomEdge);
                        _geomHighlighted = SNAP_EDGE;

                    }
                    else {

                        this.drawFace(_geomFace);
                        _geomHighlighted = SNAP_FACE;

                    }

                    _isSnapped = true;

                    break;
                }
            }
        }
    };

    this.faceSnappingWithTopology = function(face, geometry, facesTopology, mesh) {

        var vA = new THREE.Vector3();
        var vB = new THREE.Vector3();
        var vC = new THREE.Vector3();

        var geom = new THREE.Geometry();

        var attributes = geometry.attributes;

        if (attributes.index !== undefined) {

            var positions = geometry.vb ? geometry.vb : attributes.position.array;
            var stride = geometry.vb ? geometry.vbstride : 3;

            // Find the index of face topology list which includes the intersect face(triangle)
            for (var i = 0; i < facesTopology.length; i++) {

                var indexList = facesTopology[i].indexList;
                var faceId = facesTopology[i].id;
                for (var j = 0; j < indexList.length; j += 3) {

                    if (face.a === indexList[j]) {
                        if ((face.b === indexList[j + 1] && face.c === indexList[j + 2]) || (face.b === indexList[j + 2] && face.c === indexList[j + 1])) {
                            break;
                        }
                    }
                    else if (face.a === indexList[j + 1]) {
                        if ((face.b === indexList[j] && face.c === indexList[j + 2]) || (face.b === indexList[j + 2] && face.c === indexList[j])) {
                            break;
                        }
                    }
                    else if (face.a === indexList[j + 2]) {
                        if ((face.b === indexList[j] && face.c === indexList[j + 1]) || (face.b === indexList[j + 1] && face.c === indexList[j])) {
                            break;
                        }
                    }
                }

                if (j < indexList.length) {
                    break;
                }
            }

            if (i < facesTopology.length) {

                for (var j = 0; j < indexList.length; j += 3) {
                    vA.set(
                        positions[ indexList[j] * stride ],
                        positions[ indexList[j] * stride + 1 ],
                        positions[ indexList[j] * stride + 2 ]
                    );
                    vB.set(
                        positions[ indexList[j + 1] * stride ],
                        positions[ indexList[j + 1] * stride + 1 ],
                        positions[ indexList[j + 1] * stride + 2 ]
                    );
                    vC.set(
                        positions[ indexList[j + 2] * stride ],
                        positions[ indexList[j + 2] * stride + 1 ],
                        positions[ indexList[j + 2] * stride + 2 ]
                    );

                    var vIndex = geom.vertices.length;

                    geom.vertices.push(vA.clone());
                    geom.vertices.push(vB.clone());
                    geom.vertices.push(vC.clone());

                    geom.faces.push(new THREE.Face3(vIndex, vIndex + 1, vIndex + 2));
                }
            }
        }

        //console.log(face);

        if (geom.vertices.length > 0) {

            geom.faceId = faceId;
            geom.applyMatrix(mesh.matrixWorld);
            return geom;
        }
        else {

            return null;
        }

    };

    /**
     * Find the closest face next to the cast ray
     * @param face - the intersect triangle of Hit Test.
     * @param geometry - the geometry of mesh
     */
    this.faceSnapping = function(face, geometry) {

        var vA = new THREE.Vector3();
        var vB = new THREE.Vector3();
        var vC = new THREE.Vector3();

        var geom = new THREE.Geometry();  //Geometry which includes all the triangles on the same plane.

        var attributes = geometry.attributes;

        if (attributes.index !== undefined) {

            var indices = attributes.index.array || geometry.ib;
            var positions = geometry.vb ? geometry.vb : attributes.position.array;
            var stride = geometry.vb ? geometry.vbstride : 3;
            var offsets = geometry.offsets;

            if ( !offsets || offsets.length === 0) {

                offsets = [{start: 0, count: indices.length, index: 0}];

            }

            for (var oi = 0; oi < offsets.length; ++oi) {

                var start = offsets[oi].start;
                var count = offsets[oi].count;
                var index = offsets[oi].index;

                for (var i = start; i < start + count; i += 3) {

                    var a = index + indices[i];
                    var b = index + indices[i + 1];
                    var c = index + indices[i + 2];

                    vA.set(
                        positions[a * stride],
                        positions[a * stride + 1],
                        positions[a * stride + 2]
                    );
                    vB.set(
                        positions[b * stride],
                        positions[b * stride + 1],
                        positions[b * stride + 2]
                    );
                    vC.set(
                        positions[c * stride],
                        positions[c * stride + 1],
                        positions[c * stride + 2]
                    );

                    var faceNormal = THREE.Triangle.normal(vA, vB, vC);

                    var va = new THREE.Vector3();
                    va.set(
                        positions[ face.a * stride ],
                        positions[ face.a * stride + 1 ],
                        positions[ face.a * stride + 2 ]
                    );

                    if (this.isEqualVectorsWithPrecision(faceNormal, face.normal) && this.isEqualWithPrecision(faceNormal.dot(vA), face.normal.dot(va)))
                    {

                        var vIndex = geom.vertices.length;

                        geom.vertices.push(vA.clone());
                        geom.vertices.push(vB.clone());
                        geom.vertices.push(vC.clone());

                        geom.faces.push(new THREE.Face3(vIndex, vIndex + 1, vIndex + 2));

                    }
                }
            }
        }

        if (geom.vertices.length > 0) {

            return this.getTrianglesOnSameFace(geom, face, positions, stride);
        }
        else {

            return null;
        }
    };

    /**
     * Find triangles on the same face with the triangle intersected with the cast ray
     * @param geom -Geometry which includes all the triangles on the same plane.
     * @param face -Triangle which intersects with the cast ray.
     * @param positions -Positions of all vertices.
     * @param stride -Stride for the interleaved buffer.
     */
    this.getTrianglesOnSameFace = function(geom, face, positions, stride) {

        var isIncludeFace = false; // Check if the intersect face is in the mesh
        var vertexIndices = geom.vertices.slice();

        var va = new THREE.Vector3();
        va.set(
            positions[ face.a * stride ],
            positions[ face.a * stride + 1 ],
            positions[ face.a * stride + 2 ]
        );
        var vb = new THREE.Vector3();
        vb.set(
            positions[ face.b * stride ],
            positions[ face.b * stride + 1 ],
            positions[ face.b * stride + 2 ]
        );
        var vc = new THREE.Vector3();
        vc.set(
            positions[ face.c * stride ],
            positions[ face.c * stride + 1 ],
            positions[ face.c * stride + 2 ]
        );
        var intersectFace = new THREE.Geometry();
        intersectFace.vertices.push(va);
        intersectFace.vertices.push(vb);
        intersectFace.vertices.push(vc);
        intersectFace.faces.push(new THREE.Face3(0, 1, 2));

        var vCount = [];

        do {

            vCount = [];

            for (var j = 0; j < vertexIndices.length; j += 3) {

                // The triangle which is intersected with the ray
                if (vertexIndices[j].equals(va) && vertexIndices[j + 1].equals(vb) && vertexIndices[j + 2].equals(vc)) {

                    isIncludeFace = true;
                    vCount.push(j);
                    continue;
                }

                for (var k = 0; k < intersectFace.vertices.length; k += 3) {

                    // The triangles which are on the same face with the intersected triangle
                    if (this.trianglesSharedEdge(vertexIndices[j], vertexIndices[j + 1], vertexIndices[j + 2],
                            intersectFace.vertices[k], intersectFace.vertices[k + 1], intersectFace.vertices[k + 2])) {

                        var vIndex = intersectFace.vertices.length;
                        intersectFace.vertices.push(vertexIndices[j].clone());
                        intersectFace.vertices.push(vertexIndices[j + 1].clone());
                        intersectFace.vertices.push(vertexIndices[j + 2].clone());
                        intersectFace.faces.push(new THREE.Face3(vIndex, vIndex + 1, vIndex + 2));

                        vCount.push(j);
                        break;
                    }
                }
            }

            for (var ci = vCount.length - 1; ci >= 0; --ci) {

                vertexIndices.splice(vCount[ci], 3);

            }

        } while (vCount.length > 0);

        if (isIncludeFace) {
            return intersectFace;
        }
        else {
            return null;
        }

    };

    /**
     * Check if the two triangle share edge, the inputs are their vertices
     */
    this.trianglesSharedEdge = function(a1, a2, a3, b1, b2, b3) {

        var c1 = false;
        var c2 = false;
        var c3 = false;

        if (a1.equals(b1) || a1.equals(b2) || a1.equals(b3)) {
            c1 = true;
        }
        if (a2.equals(b1) || a2.equals(b2) || a2.equals(b3)) {
            c2 = true;
        }
        if (a3.equals(b1) || a3.equals(b2) || a3.equals(b3)) {
            c3 = true;
        }

        if (c1 & c2 || c1 & c3 || c2 & c3) {
            return true;
        }

        return false;
    };

    this.edgeSnappingWithTopology = function(intersectPoint, geometry, edgesTopology, mesh) {

        var edgeGeom = new THREE.Geometry();
        var minDistTopoIndex;
        var minDist = Number.MAX_VALUE;

        var vA = new THREE.Vector3();
        var vB = new THREE.Vector3();

        var attributes = geometry.attributes;

        if (attributes.index !== undefined && edgesTopology != undefined) {

            var positions = geometry.vb ? geometry.vb : attributes.position.array;
            var stride = geometry.vb ? geometry.vbstride : 3;

            // Find the index of edge topology list which includes the nearest edge segment to the intersect point
            for (var i = 0; i < edgesTopology.length; i++) {

                var indexList = edgesTopology[i].indexList;
                // In edges topology index list the type is LineStrip
                for (var j = 0; j < indexList.length - 1; j++) {
                    vA.set(
                        positions[ indexList[j] * stride ],
                        positions[ indexList[j] * stride + 1 ],
                        positions[ indexList[j] * stride + 2 ]
                    );
                    vB.set(
                        positions[ indexList[j + 1] * stride ],
                        positions[ indexList[j + 1] * stride + 1 ],
                        positions[ indexList[j + 1] * stride + 2 ]
                    );

                    vA.applyMatrix4(mesh.matrixWorld);
                    vB.applyMatrix4(mesh.matrixWorld);

                    var dist = this.distancePointToLine(intersectPoint, vA, vB);
                    if (dist < minDist) {
                        minDist = dist;
                        minDistTopoIndex = i;
                    }
                }
            }

            if (minDistTopoIndex) {
                indexList = edgesTopology[minDistTopoIndex].indexList;
                for (var k = 0; k < indexList.length - 1; k++) {
                    edgeGeom.vertices.push(new THREE.Vector3(positions[indexList[k] * stride], positions[indexList[k] * stride + 1], positions[indexList[k] * stride + 2]));
                    // To make the line's type to LinePieces which is used by drawLine function
                    edgeGeom.vertices.push(new THREE.Vector3(positions[indexList[k + 1] * stride], positions[indexList[k + 1] * stride + 1], positions[indexList[k + 1] * stride + 2]));
                }
            }
        }

        if (_distanceToEdge >= minDist && edgeGeom.vertices.length > 0) {

            _distanceToEdge = minDist;
            edgeGeom.applyMatrix(mesh.matrixWorld);
            _geomEdge = edgeGeom;
        }
    };

    /**
     * Find the closest edge next to the intersect point
     * @param face -Face which is found by faceSnapping.
     * @param intersectPoint -IntersectPoint between cast ray and face.
     * @param mesh -The whole mesh of one fragment.
     */
    this.edgeSnapping = function(face, intersectPoint) {

        var lineGeom = new THREE.Geometry();
        var isEdge_12 = true;
        var isEdge_13 = true;
        var isEdge_23 = true;

        for (var i = 0; i < face.vertices.length; i += 3) {

            for (var j = 0; j < face.vertices.length; j += 3) {

                if ( i !== j ) {
                    // Check edge 12
                    if ((face.vertices[i].equals(face.vertices[j]) || face.vertices[i].equals(face.vertices[j + 1])
                        || face.vertices[i].equals(face.vertices[j + 2]))
                        && (face.vertices[i + 1].equals(face.vertices[j]) || face.vertices[i + 1].equals(face.vertices[j + 1])
                        || face.vertices[i + 1].equals(face.vertices[j + 2]))) {

                        isEdge_12 = false;

                    }
                    // Check edge 13
                    if ((face.vertices[i].equals(face.vertices[j]) || face.vertices[i].equals(face.vertices[j + 1])
                        || face.vertices[i].equals(face.vertices[j + 2]))
                        && (face.vertices[i + 2].equals(face.vertices[j]) || face.vertices[i + 2].equals(face.vertices[j + 1])
                        || face.vertices[i + 2].equals(face.vertices[j + 2]))) {

                        isEdge_13 = false;

                    }
                    // Check edge 23
                    if ((face.vertices[i + 1].equals(face.vertices[j]) || face.vertices[i + 1].equals(face.vertices[j + 1])
                        || face.vertices[i + 1].equals(face.vertices[j + 2]))
                        && (face.vertices[i + 2].equals(face.vertices[j]) || face.vertices[i + 2].equals(face.vertices[j + 1])
                        || face.vertices[i + 2].equals(face.vertices[j + 2]))) {

                        isEdge_23 = false;

                    }
                }
            }

            if (isEdge_12) {

                lineGeom.vertices.push(face.vertices[i].clone());
                lineGeom.vertices.push(face.vertices[i + 1].clone());

            }
            if (isEdge_13) {

                lineGeom.vertices.push(face.vertices[i].clone());
                lineGeom.vertices.push(face.vertices[i + 2].clone());

            }
            if (isEdge_23) {

                lineGeom.vertices.push(face.vertices[i + 1].clone());
                lineGeom.vertices.push(face.vertices[i + 2].clone());

            }

            isEdge_12 = true;
            isEdge_13 = true;
            isEdge_23 = true;

        }

        //return lineGeom;

        var edgeGeom = new THREE.Geometry();
        var minDistIndex;
        var minDist = Number.MAX_VALUE;

        for (var k = 0; k < lineGeom.vertices.length; k += 2) {

            var dist = this.distancePointToLine(intersectPoint, lineGeom.vertices[k], lineGeom.vertices[k + 1]);

            if (dist < minDist) {
                minDist = dist;
                minDistIndex = k;
            }

        }

        edgeGeom.vertices.push(lineGeom.vertices[ minDistIndex ].clone());
        edgeGeom.vertices.push(lineGeom.vertices[ minDistIndex + 1 ].clone());

        edgeGeom.vertices = this.getConnectedLineSegmentsOnSameLine(lineGeom, edgeGeom.vertices);

        _distanceToEdge = minDist;

        return edgeGeom;

    };

    this.distancePointToLine = function (point, lineStart, lineEnd) {

        var X0 = new THREE.Vector3();
        var X1 = new THREE.Vector3();
        var distance;
        var param;

        X0.subVectors(lineStart, point);
        X1.subVectors(lineEnd, lineStart);
        param = X0.dot(X1);
        X0.subVectors(lineEnd, lineStart);
        param = -param / X0.dot(X0);

        if (param < 0) {
            distance = point.distanceTo(lineStart);
        }
        else if (param > 1) {
            distance = point.distanceTo(lineEnd);
        }
        else {
            X0.subVectors(point, lineStart);
            X1.subVectors(point, lineEnd);
            X0.cross(X1);
            X1.subVectors(lineEnd, lineStart);

            distance = Math.sqrt(X0.dot(X0)) / Math.sqrt(X1.dot(X1));
        }

        return distance;
    };

    this.getConnectedLineSegmentsOnSameLine = function(lineGeom, edgeVertices) {

        var vertices = lineGeom.vertices.slice();
        var va = edgeVertices[0];
        var vb = edgeVertices[1];

        var vCount = [];

        do {

            vCount = [];

            for (var j = 0; j < vertices.length; j += 2) {

                // The line which has min distance to intersection point
                if (vertices[j].equals(va) && vertices[j + 1].equals(vb)) {

                    continue;
                }

                for (var k = 0; k < edgeVertices.length; k += 2) {

                    // The line segments which are connected on the same line
                    if (vertices[j].equals(edgeVertices[k]) || vertices[j + 1].equals(edgeVertices[k]) ||
                        vertices[j].equals(edgeVertices[k + 1]) || vertices[j + 1].equals(edgeVertices[k + 1])) {

                        var V0 = new THREE.Vector3();
                        var V1 = new THREE.Vector3();

                        V0.subVectors(edgeVertices[k],  edgeVertices[k + 1]);
                        V0.normalize();
                        V1.subVectors(vertices[j],vertices[j + 1]);
                        V1.normalize();

                        //if (V0.equals(V1) || V0.equals(V1.negate())) {
                        if (this.isEqualVectorsWithPrecision(V0, V1) || this.isInverseVectorsWithPrecision(V0, V1))
                        {

                            vCount.push(j);
                            break;

                        }
                    }
                }
            }

            for (var ci = vCount.length - 1; ci >= 0; --ci) {

                edgeVertices.push(vertices[ vCount[ci] ]);
                edgeVertices.push(vertices[ vCount[ci] + 1 ]);
                vertices.splice(vCount[ci], 2);

            }

        } while (vCount.length > 0);

        return edgeVertices;

    };

    this.vertexSnappingWithTopology = function(edge, intersectPoint) {

        var minDist = Number.MAX_VALUE;
        var point = new THREE.Vector3();

        if (edge && edge.vertices.length > 1) {
            var dist1 = intersectPoint.distanceTo(edge.vertices[0]);
            var dist2 = intersectPoint.distanceTo(edge.vertices[edge.vertices.length - 1]);

            if (dist1 <= dist2) {
                minDist = dist1;
                point = edge.vertices[0].clone();
            }
            else {
                minDist = dist2;
                point = edge.vertices[edge.vertices.length - 1].clone();
            }
        }

        _distanceToVertex = minDist;

        return point;
    };

    /**
     * Find the closest vertex next to the intersect point
     * @param edge -Edge which is found by edgeSnapping.
     * @param intersectPoint -IntersectPoint between cast ray and face.
     */
    this.vertexSnapping = function(edge, intersectPoint) {

        var minDist = Number.MAX_VALUE;
        var point = new THREE.Vector3();

        for (var i = 0; i < edge.vertices.length; ++i) {

            var dist = intersectPoint.distanceTo(edge.vertices[i]);

            if (dist < minDist - SNAP_PRECISION) {

                minDist = dist;
                point = edge.vertices[i].clone();

            }
        }

        _distanceToVertex = minDist;

        return point;
    };

    // This is only a workaround to detect if an edge is circle
    this.edgeIsCircle = function(edge) {

        var vertices = edge.vertices;

        // Exclude squares and regular polygons
        if (vertices.length < 8) {
            return false;
        }

        if (vertices[0].equals(vertices[vertices.length - 1])) {

            var center = new THREE.Vector3(0, 0, 0);
            for (var i = 0; i < vertices.length; i += 2) {
                center.add(vertices[i]);
            }
            center.divideScalar(vertices.length / 2.0);

            var radius = center.distanceTo(vertices[0]);
            for (var i = 0; i < vertices.length; i += 2) {
                if (Math.abs(center.distanceTo(vertices[i]) - radius) <= SNAP_PRECISION) {
                    continue;
                }
                else {
                    return false;
                }
            }
            return center;
        }
        else {
            return false;
        }
    };

    this.edgeIsCurved = function (edge) {

        var vertices = edge.vertices;

        if (vertices.length <= 2) {
            return false;
        }
        else if (vertices[0].equals(vertices[vertices.length - 1])) {
            return true;
        }
        else {
            var V1 = new THREE.Vector3();
            V1.subVectors(vertices[0], vertices[1]);

            var V2 = new THREE.Vector3();
            for (var i = 2; i < vertices.length; i += 2) {
                V2.subVectors(vertices[i], vertices[i + 1]);
                if (!this.isEqualVectorsWithPrecision(V1, V2)) {
                    return true;
                }
            }

            return false;
        }
    };

    this.faceIsCurved = function (face) {

        var vertices = face.vertices;
        var faces = face.faces;

        if (faces.length <= 1) {
            return false;
        }
        else {
            var fN1 = THREE.Triangle.normal(vertices[faces[0].a], vertices[faces[0].b], vertices[faces[0].c]);
            var vA1 = vertices[faces[0].a];

            for (var i = 1; i < faces.length; i++) {
                var fN2 = THREE.Triangle.normal(vertices[faces[i].a], vertices[faces[i].b], vertices[faces[i].c]);
                var vA2 = vertices[faces[i].a];

                if (!this.isEqualVectorsWithPrecision(fN1, fN2) || !this.isEqualWithPrecision(fN1.dot(vA1), fN2.dot(vA2))) {
                    return true;
                }
            }

            return false;
        }
    };

    this.angleVector2 = function(vector) {

        if (vector.x > 0 && vector.y >= 0) {
            return Math.atan(vector.y / vector.x);
        }
        else if (vector.x >= 0 && vector.y < 0) {
            return Math.atan(vector.y / vector.x) + Math.PI * 2;
        }
        else if (vector.x < 0 && vector.y <= 0) {
            return Math.atan(vector.y / vector.x) + Math.PI;
        }
        else if (vector.x <= 0 && vector.y > 0) {
            return Math.atan(vector.y / vector.x) + Math.PI;
        }
        else{ // x = 0, y = 0
            return null;
        }
    };

    function GeometryCallback(viewer, snapper) {
        this.viewer = viewer;
        this.snapper = snapper;

        this.lineGeom = new THREE.Geometry();
        this.circularArc = null;
        this.circularArcCenter;
        this.circularArcRadius;
        this.ellipticalArc = null;
        this.ellipticalArcCenter;

        this.minDist = Number.MAX_VALUE;

        this.vpIdLine = null;
        this.vpIdCircular = null;
        this.vpIdElliptical = null;

        this.detectRadius = this.snapper.getDetectRadius();
    }

    GeometryCallback.prototype.onLineSegment = function(x1, y1, x2, y2, vpId) {
        //stderr("line segment");
        var intersectPoint = this.snapper.getIntersectPoint();
        var vertices = this.lineGeom.vertices;
        var v1 = new THREE.Vector3(x1, y1, intersectPoint.z);
        var v2 = new THREE.Vector3(x2, y2, intersectPoint.z);

        var dist = this.snapper.distancePointToLine(intersectPoint, v1, v2);
        if (dist <= this.detectRadius && dist < this.minDist) {

            vertices.splice(0, 2, v1, v2);
            this.minDist = dist;

            this.vpIdLine = vpId;
        }
    };

    GeometryCallback.prototype.onCircularArc = function(cx, cy, start, end, radius, vpId) {
        //stderr("circular arc");
        var intersectPoint = this.snapper.getIntersectPoint();
        var point = new THREE.Vector2(intersectPoint.x, intersectPoint.y);

        var center = new THREE.Vector2(cx, cy);
        var dist = point.distanceTo(center);
        point.sub(center);

        var angle = this.snapper.angleVector2(point);

        if (Math.abs(dist - radius) <= this.detectRadius) {

            if (end > start && angle >= start && angle <= end) {
                var arc = new THREE.CircleGeometry(radius, 100, start, end - start);
            }
            else if (end < start && (angle >= start || angle <= end)) {
                var arc = new THREE.CircleGeometry(radius, 100, start, Math.PI * 2 - start + end);
            }
            else {
                return;
            }
            arc.vertices.splice(0, 1);
            arc.applyMatrix(new THREE.Matrix4().makeTranslation(cx, cy, intersectPoint.z));
            this.circularArc = arc;
            this.circularArcCenter = new THREE.Vector3(cx, cy, intersectPoint.z);
            this.circularArcRadius = radius;

            this.vpIdCircular = vpId;
        }
    };

    GeometryCallback.prototype.onEllipticalArc = function(cx, cy, start, end, major, minor, tilt, vpId) {
        //stderr("elliptical arc");
        var intersectPoint = this.snapper.getIntersectPoint();
        var point = new THREE.Vector2(intersectPoint.x, intersectPoint.y);

        var major1 = major - this.detectRadius;
        var minor1 = minor - this.detectRadius;
        var major2 = major + this.detectRadius;
        var minor2 = minor + this.detectRadius;

        var equation1 = (point.x - cx) * (point.x - cx) / (major1 * major1) + (point.y - cy) * (point.y - cy) / (minor1 * minor1);
        var equation2 = (point.x - cx) * (point.x - cx) / (major2 * major2) + (point.y - cy) * (point.y - cy) / (minor2 * minor2);

        var center = new THREE.Vector2(cx, cy);
        point.sub(center);
        point.x *= minor;
        point.y *= major;
        var angle = this.snapper.angleVector2(point);

        if (end > Math.PI * 2) {
            end = Math.PI * 2;
        }

        if (equation1 >= 1 && equation2 <= 1) {

            if ((end > start && angle >= start && angle <= end) || (end < start && (angle >= start || angle <= end))){
                var curve = new THREE.EllipseCurve(cx, cy, major, minor, start, end, false);
                var path = new THREE.Path(curve.getPoints(50));
                var arc = path.createPointsGeometry(50);

                if (!this.snapper.isEqualWithPrecision(end - start, Math.PI * 2))
                {
                    arc.vertices.pop();
                }
                arc.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, intersectPoint.z));
                this.ellipticalArc = arc;
                this.ellipticalArcCenter = new THREE.Vector3(cx, cy, intersectPoint.z);

                this.vpIdElliptical = vpId;
            }
        }
    };


    this.snapping2D = function(result) {

        if (!result) {
            return;
        }
        
        var intersectPoint = result.intersectPoint;
        var fragIds = result.fragId;

        //if (_clip && !_viewer.model.pointInPolygon(intersectPoint.x, intersectPoint.y, _clip.contours, _clip.points)) {
        //    return;
        //}

        if (typeof fragIds === "undefined") {
            return;
        }
        else if (!Array.isArray(fragIds)) {
            fragIds = [fragIds];
        }

        _intersectPoint = intersectPoint;

        // Determine which one should be drawn: line, circular arc or elliptical arc
        _radius = this.setDetectRadius(intersectPoint);

        var gc = new GeometryCallback(_viewer, this);

        for (var fi = 0; fi < fragIds.length; ++fi) {

            var mesh = _viewer.impl.getRenderProxy(_viewer.model, fragIds[fi]);

            var vbr = new Autodesk.Viewing.Private.VertexBufferReader(mesh.geometry);
            vbr.enumGeomsForObject(result.dbId, gc);

        }

        if (gc.circularArc) {

            _viewportIndex2d = gc.vpIdCircular;

            // Only snap the geometries which belong to the same viewport as the first selection
            if (_firstClickVpId !== null && _firstClickVpId !== _viewportIndex2d)
                return;

            if (intersectPoint.distanceTo(gc.circularArc.vertices[0]) < _radius) {

                _geomVertex = gc.circularArc.vertices[0];
                this.drawPoint(_geomVertex);
                _geomHighlighted = SNAP_VERTEX;
            }
            else if (intersectPoint.distanceTo(gc.circularArc.vertices[gc.circularArc.vertices.length - 1]) < _radius) {

                _geomVertex = gc.circularArc.vertices[gc.circularArc.vertices.length - 1];
                this.drawPoint(_geomVertex);
                _geomHighlighted = SNAP_VERTEX;
            }
            else {

                this.lineStripToPieces(gc.circularArc);
                _geomEdge = gc.circularArc;
                this.drawLine(_geomEdge);
                _circularArcCenter = gc.circularArcCenter;
                _circularArcRadius = gc.circularArcRadius;
                _geomHighlighted = SNAP_CIRCULARARC;
            }

            _isSnapped = true;

        }
        else if (gc.ellipticalArc) {

            _viewportIndex2d = gc.vpIdElliptical;

            // Only snap the geometries which belong to the same viewport as the first selection
            if (_firstClickVpId !== null && _firstClickVpId !== _viewportIndex2d)
                return;

            if (intersectPoint.distanceTo(gc.ellipticalArc.vertices[0]) < _radius) {

                _geomVertex = gc.ellipticalArc.vertices[0];
                this.drawPoint(_geomVertex);
                _geomHighlighted = SNAP_VERTEX;
            }
            else if (intersectPoint.distanceTo(gc.ellipticalArc.vertices[gc.ellipticalArc.vertices.length - 1]) < _radius) {

                _geomVertex = gc.ellipticalArc.vertices[gc.ellipticalArc.vertices.length - 1];
                this.drawPoint(_geomVertex);
                _geomHighlighted = SNAP_VERTEX;
            }
            else {

                this.lineStripToPieces(gc.ellipticalArc);
                _geomEdge = gc.ellipticalArc;
                this.drawLine(_geomEdge);
                // Before we have measure design for elliptical arc, measure the center for now
                _circularArcCenter = gc.ellipticalArcCenter;
                _circularArcRadius = null;
                _geomHighlighted = SNAP_CIRCULARARC;
            }

            _isSnapped = true;

        }
        else if (gc.lineGeom.vertices.length) {

            _viewportIndex2d = gc.vpIdLine;

            // Only snap the geometries which belong to the same viewport as the first selection
            if (_firstClickVpId !== null && _firstClickVpId !== _viewportIndex2d)
                return;

            if (intersectPoint.distanceTo(gc.lineGeom.vertices[0]) < _radius) {

                _geomVertex = gc.lineGeom.vertices[0];
                this.drawPoint(_geomVertex);
                _geomHighlighted = SNAP_VERTEX;
            }
            else if (intersectPoint.distanceTo(gc.lineGeom.vertices[1]) < _radius) {

                _geomVertex = gc.lineGeom.vertices[1];
                this.drawPoint(_geomVertex);
                _geomHighlighted = SNAP_VERTEX;
            }
            else {

                _geomEdge = gc.lineGeom;
                this.drawLine(_geomEdge);
                _geomHighlighted = SNAP_EDGE;
            }

            _isSnapped = true;
        }

    };

    this.lineStripToPieces = function(geom) {

        var vertices = geom.vertices;
        for (var i = vertices.length - 2; i > 0; i--) {
            vertices.splice(i, 0, vertices[i]);
        }
    };

    this.createOverlay = function(overlayName) {

        _viewer.impl.createOverlayScene(overlayName);

    };

    this.addOverlay = function(overlayName, mesh) {

        _viewer.impl.addOverlay(overlayName, mesh);

    };

    this.clearOverlay = function() {

        if (_viewer.impl.overlayScenes[_faceOverlayName]) {
            _viewer.impl.clearOverlay(_faceOverlayName);
        }

        if (_viewer.impl.overlayScenes[_vertexOverlayName]) {
            _viewer.impl.clearOverlay(_vertexOverlayName);
        }

        if (_viewer.impl.overlayScenes[_edgeOverlayName]) {
            _viewer.impl.clearOverlay(_edgeOverlayName);
        }

    };

    /**
     * Draw the planar face
     * @param geom -Geometry which needs to be draw.
     * @param mesh -Mesh which is loaded.
     */
    this.drawFace = function(geom) {

        this.createOverlay(_faceOverlayName);

        var planeColor = 0x00CC00;
        var planeOpacity = 0.5;

        var material = new THREE.MeshPhongMaterial({
            color: planeColor,
            ambient: planeColor,
            opacity: planeOpacity,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        //geom.attributes.index.array = new geom.attributes.index.array.constructor(indicesNew);
        var snapperPlane = new THREE.Mesh(geom, material, true);
        //snapperPlane.matrixWorld = mesh.matrixWorld;

        this.addOverlay(_faceOverlayName, snapperPlane);

    };

    this.cylinderMesh = function(pointX, pointY, material) {

        var direction = new THREE.Vector3().subVectors(pointY, pointX);
        var orientation = new THREE.Matrix4();
        orientation.lookAt(pointX, pointY, new THREE.Object3D().up);
        orientation.multiply(new THREE.Matrix4().set(1, 0, 0, 0,
            0, 0, 1, 0,
            0, -1, 0, 0,
            0, 0, 0, 1));
        var edgeGeometry = new THREE.CylinderGeometry(0.5, 0.5, direction.length(), 8, 1, true);
        var edge = new THREE.Mesh(edgeGeometry, material);
        edge.applyMatrix(orientation);
        edge.position.x = (pointY.x + pointX.x) / 2;
        edge.position.y = (pointY.y + pointX.y) / 2;
        edge.position.z = (pointY.z + pointX.z) / 2;
        return edge;

    };

    this.drawLine = function(geom) {

        this.createOverlay(_edgeOverlayName);

        var planeColor = 0x00CC00;
        var planeOpacity = 0.5;

        var material = new THREE.MeshPhongMaterial({
            color: planeColor,
            ambient: planeColor,
            opacity: planeOpacity,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        // Line Pieces
        for (var i = 0; i < geom.vertices.length; i += 2) {
            var cylinder = this.cylinderMesh(geom.vertices[i], geom.vertices[i + 1], material);
            this.setEdgeScale(cylinder);
            this.addOverlay(_edgeOverlayName, cylinder);
        }
    };

    this.drawArc = function(geom) {

        this.createOverlay(_edgeOverlayName);

        var planeColor = 0x00CC00;
        var planeOpacity = 0.5;

        var material = new THREE.MeshPhongMaterial({
            color: planeColor,
            ambient: planeColor,
            opacity: planeOpacity,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        // Line Strip
        for (var i = 0; i < geom.vertices.length - 1; i++) {
            var cylinder = this.cylinderMesh(geom.vertices[i], geom.vertices[i + 1], material);
            this.setEdgeScale(cylinder);
            this.addOverlay(_edgeOverlayName, cylinder);
        }
    };

    this.drawPoint = function(point) {

        this.createOverlay(_vertexOverlayName);

        var planeColor = 0x00CC00;
        var planeOpacity = 0.5;

        var material = new THREE.MeshPhongMaterial({
            color: planeColor,
            ambient: planeColor,
            opacity: planeOpacity,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });

        var pointMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0), material);
        //point.applyMatrix4(mesh.matrixWorld);
        pointMesh.position.set(point.x, point.y, point.z);

        this.setPointScale(pointMesh);

        this.addOverlay(_vertexOverlayName, pointMesh);

    };

    this.setScale = function (mesh) {
        var pixelSize = 5;

        var navapi = _viewer.navigation;
        var camera = navapi.getCamera();

        var view = navapi.getEyeVector();
        var position = navapi.getPosition();

        var point = mesh.position.clone();

        var distance = camera.isPerspective ? point.sub(position).dot(view.normalize())
            : navapi.getEyeVector().length();

        var fov = navapi.getVerticalFov();
        var worldHeight = 2.0 * distance * Math.tan(THREE.Math.degToRad(fov * 0.5));

        var viewport = navapi.getScreenViewport();
        var devicePixelRatio = window.devicePixelRatio || 1;
        var scale = pixelSize * worldHeight / (viewport.height * devicePixelRatio);

        return scale;
    };

    this.setPointScale = function (pointMesh) {

        var scale = this.setScale(pointMesh);
        pointMesh.scale.x = scale;
        pointMesh.scale.y = scale;
        pointMesh.scale.z = scale;

    };

    this.setEdgeScale = function (cylinderMesh) {

        var scale = this.setScale(cylinderMesh);
        cylinderMesh.scale.x = scale;
        cylinderMesh.scale.z = scale;
    };

    this.updatePointScale = function() {

        var overlay = _viewer.impl.overlayScenes[_vertexOverlayName];
        if (overlay) {
            var scene = overlay.scene;

            for (var i = 0; i < scene.children.length; i++) {
                var pointMesh = scene.children[i];
                if (pointMesh) {

                    this.setPointScale(pointMesh);
                }
            }
        }
    };

    this.updateEdgeScale = function() {

        var overlay = _viewer.impl.overlayScenes[_edgeOverlayName];
        if (overlay) {
            var scene = overlay.scene;

            for (var i = 0; i < scene.children.length; i++) {
                var cylinderMesh = scene.children[i];
                if (cylinderMesh) {

                    this.setEdgeScale(cylinderMesh);
                }
            }
        }
    };

    this.setDetectRadius = function(point) {

        //Notice: The pixelSize should correspond to the amount of pixels per line in idAtPixels, the shape of
        //detection area is square in idAtPixels, but circle in snapper, should make their areas match roughly.
        var pixelSize = 10;

        var navapi = _viewer.navigation;
        var camera = navapi.getCamera();

        var view = navapi.getEyeVector();
        var position = navapi.getPosition();

        var p = point.clone();

        var distance = camera.isPerspective ? p.sub(position).dot(view.normalize())
            : navapi.getEyeVector().length();

        var fov = navapi.getVerticalFov();
        var worldHeight = 2.0 * distance * Math.tan(THREE.Math.degToRad(fov * 0.5));

        var viewport = navapi.getScreenViewport();
        var devicePixelRatio = window.devicePixelRatio || 1;
        var radius = pixelSize * worldHeight / (viewport.height * devicePixelRatio);

        return radius;
    };

    this.drawIntersectFace = function(face, positions, stride, mesh) {

        this.createOverlay();

        var va = new THREE.Vector3();
        va.set(
            positions[ face.a * stride ],
            positions[ face.a * stride + 1 ],
            positions[ face.a * stride + 2 ]
        );
        var vb = new THREE.Vector3();
        vb.set(
            positions[ face.b * stride ],
            positions[ face.b * stride + 1 ],
            positions[ face.b * stride + 2 ]
        );
        var vc = new THREE.Vector3();
        vc.set(
            positions[ face.c * stride ],
            positions[ face.c * stride + 1 ],
            positions[ face.c * stride + 2 ]
        );

        var intersectFace = new THREE.Geometry();
        intersectFace.vertices.push(va);
        intersectFace.vertices.push(vb);
        intersectFace.vertices.push(vc);
        intersectFace.faces.push(new THREE.Face3(0, 1, 2));

        var faceMesh = new THREE.Mesh(intersectFace, mesh.material, true);
        faceMesh.matrixWorld = mesh.matrixWorld;

        this.addOverlay(faceMesh);

    };

    this.handleWheelInput = function (delta) {
        this.updatePointScale();
        this.updateEdgeScale();
        return false;
    };

    this.handleButtonDown = function (event, button) {
        _isDragging = true;
        return false;
    };

    this.handleButtonUp = function (event, button) {
        _isDragging = false;
        return false;
    };

    this.handleMouseMove = function (event) {

        if (!_isDragging) {

            this.clearOverlay();

            _geomFace = null;
            _geomEdge = null;
            _geomVertex = null;

            _isSnapped = false;

            var result = _viewer.impl.snappingHitTest(event.canvasX, event.canvasY, false);

            if (result && result.intersectPoint) {

                //console.log("intersect node is " + result.node.dbId);
                //console.log("fragId is " + result.node.fragIds);

                // 3D Snapping
                if (result.face) {

                    this.snapping3D(result);
                }
                // 2D Snapping
                else {

                    this.snapping2D(result);
                }
            }
        }
        return false;
    };

    this.destroy = function() {

        this.clearOverlay();

        _viewer.impl.removeOverlayScene(_faceOverlayName);
        _viewer.impl.removeOverlayScene(_vertexOverlayName);
        _viewer.impl.removeOverlayScene(_edgeOverlayName);

    };

};