package model

import (
	"image"
	"iter"
	"math"
	"slices"
	"strconv"
	"strings"
)

// graph is represented by an adjacency list.
type graph[Node comparable] map[Node][]Node

// link creates a directed edge from node a to node b.
func (g graph[Node]) link(a, b Node) graph[Node] {
	g[a] = append(g[a], b)
	return g
}

// Neighbours returns the neighbour nodes of node n in the graph.
// This method makes graph[Node] implement the astar.Graph[Node] interface.
func (g graph[Node]) Neighbours(n Node) iter.Seq[Node] {
	return slices.Values(g[n])
}

// A Pathfinder is created and initialized with a set of polygons via
// NewPathfinder. Its Path method finds the shortest path between two points
// in this polygon set.
type Pathfinder struct {
	polygons        [][]image.Point
	polygonSet      PolygonSet
	concaveVertices []image.Point
	visibilityGraph graph[image.Point]
}

// NewPathfinder creates a Pathfinder instance and initializes it with a set of
// polygons.
//
// A polygon is represented by a slice of points, i.e. []image.Point, describing
// the vertices of the polygon. Thus [][]image.Point is a slice of polygons,
// i.e. the set of polygons.
//
// Each polygon in the polygon set designates either an area that is accessible
// for path finding or a hole inside such an area, i.e. an obstacle. Nested
// polygons alternate between accessible area and inaccessible hole:
//   - Polygons at the first level are area polygons.
//   - Polygons contained inside an area polygon are holes.
//   - Polygons contained inside a hole are area polygons again.
func NewPathfinder(polygons [][]image.Point) *Pathfinder {
	polygonSet := convert(polygons, func(ps []image.Point) Polygon {
		return ps2vs(ps)
	})
	return &Pathfinder{
		polygons:        polygons,
		polygonSet:      polygonSet,
		concaveVertices: concaveVertices(polygonSet),
	}
}

// VisibilityGraph returns the calculated visibility graph from the last Path
// call. It is only available after Path was called, otherwise nil.
func (p *Pathfinder) VisibilityGraph() map[image.Point][]image.Point {
	return p.visibilityGraph
}

// Path finds the shortest path from start to dest within the bounds of the
// polygons the Pathfinder was initialized with.
// If dest is outside the polygon set it will be clamped to the nearest
// polygon edge.
// The function returns nil if no path exists because start is outside
// the polygon set.
func (p *Pathfinder) Path(start, dest image.Point) []image.Point {

	d := p2v(dest)
	if !p.polygonSet.Contains(d) {
		dest = ensureInside(p.polygonSet, v2p(p.polygonSet.ClosestPt(d)))
	}

	s := p2v(start)
	if !p.polygonSet.Contains(s) {
		start = ensureInside(p.polygonSet, v2p(p.polygonSet.ClosestPt(s)))
	}

	graphVertices := append(p.concaveVertices, start, dest)
	p.visibilityGraph = visibilityGraph(p.polygonSet, graphVertices)
	return FindPath[image.Point](p.visibilityGraph, start, dest, nodeDist, nodeDist)
}

func ensureInside(ps PolygonSet, pt image.Point) image.Point {
	if ps.Contains(p2v(pt)) {
		return pt
	}
adjustment:
	for dx := -1; dx <= 1; dx++ {
		for dy := -1; dy <= 1; dy++ {
			if dx == 0 && dy == 0 {
				continue
			}
			npt := pt.Add(image.Point{X: dx, Y: dy})
			if ps.Contains(p2v(npt)) {
				pt = npt
				break adjustment
			}
		}
	}
	return pt
}

func concaveVertices(ps PolygonSet) []image.Point {
	var vs []image.Point
	for i, p := range ps {
		t := concave
		if isHole(ps, i) {
			t = convex
		}
		vs = append(vs, verticesOfType(p, t)...)
	}
	return vs
}

func isHole(ps PolygonSet, i int) bool {
	hole := false
	for j, p := range ps {
		if i != j && p.Contains(ps[i][0], false) {
			hole = !hole
		}
	}
	return hole
}

type vertexType int

const (
	concave = vertexType(iota)
	convex
)

func verticesOfType(p Polygon, t vertexType) []image.Point {
	var vs []image.Point
	for i, v := range p {
		isConcave := p.IsConcaveAt(i)
		if (t == concave && isConcave) || (t == convex && !isConcave) {
			vs = append(vs, v2p(v))
		}
	}
	return vs
}

func visibilityGraph(ps PolygonSet, points []image.Point) graph[image.Point] {
	vis := make(graph[image.Point])
	for i, a := range points {
		for j, b := range points {
			if i == j {
				continue
			}
			if inLineOfSight(ps, p2v(a), p2v(b)) {
				vis.link(a, b)
			}
		}
	}
	return vis
}

func inLineOfSight(ps PolygonSet, start, end Vec2) bool {
	lineOfSight := LineSeg{A: start, B: end}
	for _, p := range ps {
		if p.IsCrossedBy(lineOfSight) {
			return false
		}
	}
	return ps.Contains(lineOfSight.Middle())
}

// nodeDist is the cost function for the A* algorithm. The visibility graph has
// 2d points as nodes, so we calculate the Euclidean distance.
func nodeDist(a, b image.Point) float64 {
	c := a.Sub(b)
	return math.Sqrt(float64(c.X*c.X + c.Y*c.Y))
}

// A LineSeg represents a line segment between two points A and B.
type LineSeg struct {
	A, B Vec2
}

// Len returns the length of a line segment.
func (l LineSeg) Len() float32 {
	return l.A.Dist(l.B)
}

// ClosestPt returns the point on the line segment l that is closest to point p.
// This is either the orthogonal projection of p onto l or one of l's end
// points if the projection is not within the line segment.
func (l LineSeg) ClosestPt(p Vec2) Vec2 {
	v := l.B.Sub(l.A)
	w := p.Sub(l.A)
	c1 := w.Dot(v)
	if c1 <= 0 {
		return l.A
	}
	c2 := v.Dot(v)
	if c2 <= c1 {
		return l.B
	}
	return l.A.Add(v.Mul(c1 / c2))
}

// Crosses returns true if line segments l and m cross each other,
// otherwise false.
func (l LineSeg) Crosses(m LineSeg) bool {
	u := l.A.Sub(l.B)
	v := m.A.Sub(m.B)
	D := u.CrossLen(v)
	if D == 0 {
		// The line segments are parallel.
		return false
	}
	w := l.B.Sub(m.B)
	n1 := u.CrossLen(w)
	n2 := v.CrossLen(w)
	if n1 == 0 || n2 == 0 {
		return false
	}
	r := n1 / D
	s := n2 / D
	return (0 < r && r < 1) && (0 < s && s < 1)
}

// Middle returns the middle of the line segment.
func (l LineSeg) Middle() Vec2 {
	return l.A.Add(l.B).Div(2)
}

// NearEq determines whether two line segments are equal or not.
// The order of the end points is relevant.
func (l LineSeg) NearEq(m LineSeg) bool {
	return l.A.NearEq(m.A) && l.B.NearEq(m.B)
}

// String returns a string representation of l like "L(1.5, 1):(2, 3.4)".
func (l LineSeg) String() string {
	return "L" + l.A.String() + ":" + l.B.String()
}

// Line represents a straight line that goes through the two points of a
// line segment and continues to infinity in both directions.
type Line struct {
	Seg LineSeg
}

// Intersect returns the intersection point p of two lines l and m.
// Returns false if the lines are parallel and therefore no such
// intersection point exists.
func (l Line) Intersect(m Line) (p Vec2, exists bool) {
	u := l.Seg.A.Sub(l.Seg.B)
	v := m.Seg.A.Sub(m.Seg.B)
	D := u.CrossLen(v)
	if D == 0 {
		// The lines are parallel.
		return Vec2{}, false
	}
	r := l.Seg.A.CrossLen(l.Seg.B) / D
	s := m.Seg.A.CrossLen(m.Seg.B) / D
	return v.Mul(r).Sub(u.Mul(s)), true
}

// Side reports on which side of the line point p is.
// It is +1 on one side, -1 on the other side, and 0 on the line.
func (l Line) Side(p Vec2) int {
	ap := p.Sub(l.Seg.A)
	ab := l.Seg.B.Sub(l.Seg.A)
	return sgn(ap.CrossLen(ab))
}

// sgn returns -1 if x is negative, +1 if x is positive, and 0 otherwise.
func sgn(x float32) int {
	switch {
	case x < 0:
		return -1
	case x > 0:
		return +1
	default:
		return 0
	}
}

// A Polygon is a polygon in 2-dimensional space, represented as a slice
// of its vertices.
type Polygon []Vec2

// ParsePolygon parses a new polygon from a comma-separated coordinate
// string, for example "186.5,364.7,303.25,374,303.1,412". Should have an
// even number of coordinate values. Rest is ignored.
func ParsePolygon(coords string) Polygon {
	floats := ParseFloats(coords)
	n := len(floats)
	p := make(Polygon, 0, n/2)
	for i := 0; i < n-1; i += 2 {
		v := V2(floats[i], floats[i+1])
		p = append(p, v)
	}
	return p
}

// Edge returns the edge with index i of polygon p.
func (p Polygon) Edge(i int) LineSeg {
	j := (i + 1) % len(p)
	return LineSeg{p[i], p[j]}
}

// Contains checks if point pt lies inside the boundary of polygon p.
func (p Polygon) Contains(pt Vec2, toleranceOnOutside bool) bool {
	// Ray casting algorithm: if a ray from point pt in any direction
	// (in our case horizontally to the east) crosses an odd number
	// of polygon edges, then pt lies inside the polygon, otherwise
	// outside.
	in := false
	for i := range p {
		edge := p.Edge(i)
		if edge.ClosestPt(pt).NearEq(pt) {
			return toleranceOnOutside
		}
		if hRayIntersects(pt, edge) {
			in = !in
		}
	}
	return in
}

// IsCrossedBy checks if any side of polygon p is crossed by line segment ls.
func (p Polygon) IsCrossedBy(ls LineSeg) bool {
	for i, v := range p {
		if ls.A == v || ls.B == v {
			continue
		}
		if ls.Crosses(p.Edge(i)) {
			return true
		}
		if ls.ClosestPt(v) == v {
			prev := p[p.WrapIndex(i-1)]
			next := p[p.WrapIndex(i+1)]
			l := Line{ls}
			if l.Side(prev) != l.Side(next) {
				return true
			}
		}
	}
	return false
}

// hRayIntersects checks if a horizontal ray from point p to the right
// intersects a line segment.
func hRayIntersects(p Vec2, ls LineSeg) bool {
	if !hLineIntersects(p, ls) {
		return false
	}
	hRay := Line{LineSeg{p, V2(p.X+1, p.Y)}}
	q, _ := hRay.Intersect(Line{ls})

	// Checks whether p is on the left-hand side of the line segment
	// by comparing p.X to the x coordinate of the intersection point q.
	return p.X <= q.X
}

// hLineIntersects checks if a horizontal line through point p intersects a
// line segment.
func hLineIntersects(p Vec2, ls LineSeg) bool {
	// True, if each end point of the line segment lies on a
	// different side of the horizontal line.
	return (ls.A.Y >= p.Y) != (ls.B.Y >= p.Y)
}

// match is a helper structure for closest point algorithms. Used to hold the
// current best match and its distance.
type match struct {
	pt   Vec2
	dist float32
}

// ClosestPt returns the closest point to point pt on the outline of
// polygon p.
func (p Polygon) ClosestPt(pt Vec2) Vec2 {
	var best match
	best.pt = p[0]
	best.dist = best.pt.SqDist(pt)
	for i := range p {
		var current match
		current.pt = p.Edge(i).ClosestPt(pt)
		current.dist = current.pt.SqDist(pt)
		if current.dist < best.dist {
			best = current
		}
	}
	return best.pt
}

// IsConcaveAt checks, whether the vertex with index i of polygon p is
// concave or not.
func (p Polygon) IsConcaveAt(i int) bool {
	v := p[i]
	prev := p[p.WrapIndex(i-1)]
	next := p[p.WrapIndex(i+1)]
	left := v.Sub(prev)
	right := next.Sub(v)
	return left.CrossLen(right) < 0
}

// WrapIndex returns an index based on i that can be safely used to access an
// element of p. It wraps around if i < 0 or i >= len(p).
func (p Polygon) WrapIndex(i int) int {
	n := len(p)
	return ((i % n) + n) % n
}

// A PolygonSet represents multiple polygons.
type PolygonSet []Polygon

// ParsePolygons parses polygons from n comma-separated coordinate
// strings and returns them as a PolygonSet. See ParsePolygon for
// details on the format.
func ParsePolygons(coords []string) PolygonSet {
	ps := make([]Polygon, len(coords))
	for i, cs := range coords {
		ps[i] = ParsePolygon(cs)
	}
	return ps
}

// Contains checks if point pt lies inside the boundaries of a polygon set.
// Overlapping polygons can form holes and islands.
func (ps PolygonSet) Contains(pt Vec2) bool {
	in := false
	for _, p := range ps {
		if p.Contains(pt, !in) {
			in = !in
		}
	}
	return in
}

// ClosestPt returns the closest point to point pt on any of the outlines of
// polygon set ps.
func (ps PolygonSet) ClosestPt(pt Vec2) Vec2 {
	var best match
	best.pt = ps[0].ClosestPt(pt)
	best.dist = best.pt.SqDist(pt)
	for _, p := range ps {
		var current match
		current.pt = p.ClosestPt(pt)
		current.dist = current.pt.SqDist(pt)
		if current.dist < best.dist {
			best = current
		}
	}
	return best.pt
}

// ParseFloats parses a slice of float32s from a comma-separated
// string of numbers, for example "186.5,364.7,303.25,374,303.1,412".
// Spaces are ignored.
func ParseFloats(s string) []float32 {
	tokens := strings.Split(s, ",")
	floats := make([]float32, 0, len(tokens))
	for i, tok := range tokens {
		tok = strings.TrimSpace(tok)
		if i == 0 && len(tok) == 0 {
			break
		}
		f, _ := strconv.ParseFloat(tok, 32)
		floats = append(floats, float32(f))
	}
	return floats
}
