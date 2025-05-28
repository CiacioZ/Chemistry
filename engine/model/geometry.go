package model

import (
	"image"
	"math"
	"slices"
	"strconv"
	"unsafe"
)

// A Vec2 represents a vector with coordinates X and Y in 2-dimensional
// euclidean space.
type Vec2 struct {
	X, Y float32
}

// A Size represents the dimensions of a rectangle.
type Size struct {
	// Width and height
	W, H float32
}

var (
	// V2Zero is the zero vector (0,0).
	V2Zero = Vec2{0, 0}
	// V2Unit is the unit vector (1,1).
	V2Unit = Vec2{1, 1}
	// V2UnitX is the x-axis unit vector (1,0).
	V2UnitX = Vec2{1, 0}
	// V2UnitY is the y-axis unit vector (0,1).
	V2UnitY = Vec2{0, 1}
)

// V2 is shorthand for Vec2{X: x, Y: y}.
func V2(x, y float32) Vec2 {
	return Vec2{x, y}
}

// Add returns the vector v+w.
func (v Vec2) Add(w Vec2) Vec2 {
	return Vec2{v.X + w.X, v.Y + w.Y}
}

// Sub returns the vector v-w.
func (v Vec2) Sub(w Vec2) Vec2 {
	return Vec2{v.X - w.X, v.Y - w.Y}
}

// Mul returns the vector v*s.
func (v Vec2) Mul(s float32) Vec2 {
	return Vec2{v.X * s, v.Y * s}
}

// Div returns the vector v/s.
func (v Vec2) Div(s float32) Vec2 {
	return Vec2{v.X / s, v.Y / s}
}

// Neg returns the negated vector of v.
func (v Vec2) Neg() Vec2 {
	return v.Mul(-1)
}

// Dot returns the dot (a.k.a. scalar) product of v and w.
func (v Vec2) Dot(w Vec2) float32 {
	return v.X*w.X + v.Y*w.Y
}

// CrossLen returns the length that the cross product of v and w would have
// in 3-dimensional euclidean space. This is effectively the Z component
// of the 3D cross product vector.
func (v Vec2) CrossLen(w Vec2) float32 {
	return v.X*w.Y - v.Y*w.X
}

// CompMul returns the component-wise multiplication of two vectors.
func (v Vec2) CompMul(w Vec2) Vec2 {
	return Vec2{v.X * w.X, v.Y * w.Y}
}

// CompDiv returns the component-wise division of two vectors.
func (v Vec2) CompDiv(w Vec2) Vec2 {
	return Vec2{v.X / w.X, v.Y / w.Y}
}

// SqDist returns the square of the euclidean distance between two vectors.
func (v Vec2) SqDist(w Vec2) float32 {
	return v.Sub(w).SqLen()
}

// Dist returns the euclidean distance between two vectors.
func (v Vec2) Dist(w Vec2) float32 {
	return v.Sub(w).Len()
}

// SqLen returns the square of the length (euclidean norm) of a vector.
func (v Vec2) SqLen() float32 {
	return v.Dot(v)
}

// Len returns the length (euclidean norm) of a vector.
func (v Vec2) Len() float32 {
	return float32(math.Sqrt(float64(v.SqLen())))
}

// Norm returns the normalized vector of a vector.
func (v Vec2) Norm() Vec2 {
	return v.Div(v.Len())
}

// Reflect returns the reflection vector of v given a normal n.
func (v Vec2) Reflect(n Vec2) Vec2 {
	return v.Sub(n.Mul(2 * v.Dot(n)))
}

// Lerp returns the linear interpolation between v and w by amount t.
// The amount t is usually a value between 0 and 1. If t=0 v will be
// returned; if t=1 w will be returned.
func (v Vec2) Lerp(w Vec2, t float32) Vec2 {
	// return v.Add(w.Sub(v).Mul(t))
	return Vec2{lerp(v.X, w.X, t), lerp(v.Y, w.Y, t)}
}

// Min returns a vector with each component set to the lesser value
// of the corresponding component pair of v and w.
func (v Vec2) Min(w Vec2) Vec2 {
	return Vec2{min(v.X, w.X), min(v.Y, w.Y)}
}

// Max returns a vector with each component set to the greater value
// of the corresponding component pair of v and w.
func (v Vec2) Max(w Vec2) Vec2 {
	return Vec2{max(v.X, w.X), max(v.Y, w.Y)}
}

// Transform transforms vector v with 4x4 matrix m.
func (v Vec2) Transform(m *Mat4) Vec2 {
	return Vec2{
		m[0][0]*v.X + m[1][0]*v.Y + m[3][0],
		m[0][1]*v.X + m[1][1]*v.Y + m[3][1],
	}
}

// Z returns a Vec3 based on v with the additional coordinate z.
func (v Vec2) Z(z float32) Vec3 {
	return Vec3{v.X, v.Y, z}
}

// NearEq returns whether v and w are approximately equal. This relation is not
// transitive in general. The tolerance for the floating-point components is
// ±1e-5.
func (v Vec2) NearEq(w Vec2) bool {
	return nearEq(v.X, w.X, epsilon) && nearEq(v.Y, w.Y, epsilon)
}

// String returns a string representation of v like "(3.25, -1.5)".
func (v Vec2) String() string {
	return "(" + str(v.X) + ", " + str(v.Y) + ")"
}

// A Vec3 represents a vector with coordinates X, Y and Z in 3-dimensional
// euclidean space.
type Vec3 struct {
	X, Y, Z float32
}

var (
	// V3Zero is the zero vector (0,0,0).
	V3Zero = Vec3{0, 0, 0}
	// V3Unit is the unit vector (1,1,1).
	V3Unit = Vec3{1, 1, 1}
	// V3UnitX is the x-axis unit vector (1,0,0).
	V3UnitX = Vec3{1, 0, 0}
	// V3UnitY is the y-axis unit vector (0,1,0).
	V3UnitY = Vec3{0, 1, 0}
	// V3UnitZ is the z-axis unit vector (0,0,1).
	V3UnitZ = Vec3{0, 0, 1}
)

// V3 is shorthand for Vec3{X: x, Y: y, Z: z}.
func V3(x, y, z float32) Vec3 {
	return Vec3{x, y, z}
}

// Add returns the vector v+w.
func (v Vec3) Add(w Vec3) Vec3 {
	return Vec3{v.X + w.X, v.Y + w.Y, v.Z + w.Z}
}

// Sub returns the vector v-w.
func (v Vec3) Sub(w Vec3) Vec3 {
	return Vec3{v.X - w.X, v.Y - w.Y, v.Z - w.Z}
}

// Mul returns the vector v*s.
func (v Vec3) Mul(s float32) Vec3 {
	return Vec3{v.X * s, v.Y * s, v.Z * s}
}

// Div returns the vector v/s.
func (v Vec3) Div(s float32) Vec3 {
	return Vec3{v.X / s, v.Y / s, v.Z / s}
}

// Neg returns the negated vector of v.
func (v Vec3) Neg() Vec3 {
	return v.Mul(-1)
}

// Dot returns the dot (a.k.a. scalar) product of v and w.
func (v Vec3) Dot(w Vec3) float32 {
	return v.X*w.X + v.Y*w.Y + v.Z*w.Z
}

// Cross returns the cross product of v and w.
func (v Vec3) Cross(w Vec3) Vec3 {
	return Vec3{
		v.Y*w.Z - v.Z*w.Y,
		v.Z*w.X - v.X*w.Z,
		v.X*w.Y - v.Y*w.X,
	}
}

// CompMul returns the component-wise multiplication of two vectors.
func (v Vec3) CompMul(w Vec3) Vec3 {
	return Vec3{v.X * w.X, v.Y * w.Y, v.Z * w.Z}
}

// CompDiv returns the component-wise division of two vectors.
func (v Vec3) CompDiv(w Vec3) Vec3 {
	return Vec3{v.X / w.X, v.Y / w.Y, v.Z / w.Z}
}

// SqDist returns the square of the euclidean distance between two vectors.
func (v Vec3) SqDist(w Vec3) float32 {
	return v.Sub(w).SqLen()
}

// Dist returns the euclidean distance between two vectors.
func (v Vec3) Dist(w Vec3) float32 {
	return v.Sub(w).Len()
}

// SqLen returns the square of the length (euclidean norm) of a vector.
func (v Vec3) SqLen() float32 {
	return v.Dot(v)
}

// Len returns the length (euclidean norm) of a vector.
func (v Vec3) Len() float32 {
	return float32(math.Sqrt(float64(v.SqLen())))
}

// Norm returns the normalized vector of a vector.
func (v Vec3) Norm() Vec3 {
	return v.Div(v.Len())
}

// Reflect returns the reflection vector of v given a normal n.
func (v Vec3) Reflect(n Vec3) Vec3 {
	return v.Sub(n.Mul(2 * v.Dot(n)))
}

// Lerp returns the linear interpolation between v and w by amount t.
// The amount t is usually a value between 0 and 1. If t=0 v will be
// returned; if t=1 w will be returned.
func (v Vec3) Lerp(w Vec3, t float32) Vec3 {
	return Vec3{lerp(v.X, w.X, t), lerp(v.Y, w.Y, t), lerp(v.Z, w.Z, t)}
}

// Min returns a vector with each component set to the lesser value
// of the corresponding component pair of v and w.
func (v Vec3) Min(w Vec3) Vec3 {
	return Vec3{
		min(v.X, w.X),
		min(v.Y, w.Y),
		min(v.Z, w.Z),
	}
}

// Max returns a vector with each component set to the greater value
// of the corresponding component pair of v and w.
func (v Vec3) Max(w Vec3) Vec3 {
	return Vec3{
		max(v.X, w.X),
		max(v.Y, w.Y),
		max(v.Z, w.Z),
	}
}

// Transform transforms vector v with 4x4 matrix m.
func (v Vec3) Transform(m *Mat4) Vec3 {
	return Vec3{
		m[0][0]*v.X + m[1][0]*v.Y + m[2][0]*v.Z + m[3][0],
		m[0][1]*v.X + m[1][1]*v.Y + m[2][1]*v.Z + m[3][1],
		m[0][2]*v.X + m[1][2]*v.Y + m[2][2]*v.Z + m[3][2],
	}
}

// NearEq returns whether v and w are approximately equal. This relation is not
// transitive in general. The tolerance for the floating-point components is
// ±1e-5.
func (v Vec3) NearEq(w Vec3) bool {
	return nearEq(v.X, w.X, epsilon) &&
		nearEq(v.Y, w.Y, epsilon) &&
		nearEq(v.Z, w.Z, epsilon)
}

// String returns a string representation of v like "(3.25, -1.5, 1.2)".
func (v Vec3) String() string {
	return "(" + str(v.X) + ", " + str(v.Y) + ", " + str(v.Z) + ")"
}

// A Mat4 represents a 4x4 matrix. The indices are [row][column].
type Mat4 [4][4]float32

// id is the 4x4 identity matrix.
var id = Mat4{
	{1, 0, 0, 0},
	{0, 1, 0, 0},
	{0, 0, 1, 0},
	{0, 0, 0, 1},
}

// zero is the 4x4 zero matrix.
var zero Mat4

// ID sets m to the identity matrix and returns m.
func (m *Mat4) ID() *Mat4 {
	*m = id
	return m
}

// Zero sets all elements of m to 0 (zero matrix) and returns m.
func (m *Mat4) Zero() *Mat4 {
	*m = zero
	return m
}

// Det calculates the determinant of 4x4 matrix m.
func (m *Mat4) Det() float32 {
	return m[0][3]*m[1][2]*m[2][1]*m[3][0] - m[0][2]*m[1][3]*m[2][1]*m[3][0] -
		m[0][3]*m[1][1]*m[2][2]*m[3][0] + m[0][1]*m[1][3]*m[2][2]*m[3][0] +
		m[0][2]*m[1][1]*m[2][3]*m[3][0] - m[0][1]*m[1][2]*m[2][3]*m[3][0] -
		m[0][3]*m[1][2]*m[2][0]*m[3][1] + m[0][2]*m[1][3]*m[2][0]*m[3][1] +
		m[0][3]*m[1][0]*m[2][2]*m[3][1] - m[0][0]*m[1][3]*m[2][2]*m[3][1] -
		m[0][2]*m[1][0]*m[2][3]*m[3][1] + m[0][0]*m[1][2]*m[2][3]*m[3][1] +
		m[0][3]*m[1][1]*m[2][0]*m[3][2] - m[0][1]*m[1][3]*m[2][0]*m[3][2] -
		m[0][3]*m[1][0]*m[2][1]*m[3][2] + m[0][0]*m[1][3]*m[2][1]*m[3][2] +
		m[0][1]*m[1][0]*m[2][3]*m[3][2] - m[0][0]*m[1][1]*m[2][3]*m[3][2] -
		m[0][2]*m[1][1]*m[2][0]*m[3][3] + m[0][1]*m[1][2]*m[2][0]*m[3][3] +
		m[0][2]*m[1][0]*m[2][1]*m[3][3] - m[0][0]*m[1][2]*m[2][1]*m[3][3] -
		m[0][1]*m[1][0]*m[2][2]*m[3][3] + m[0][0]*m[1][1]*m[2][2]*m[3][3]
}

// Mul sets m to the matrix product a*b and returns m.
func (m *Mat4) Mul(a *Mat4, b *Mat4) *Mat4 {
	*m = Mat4{
		{
			a[0][0]*b[0][0] + a[1][0]*b[0][1] + a[2][0]*b[0][2] + a[3][0]*b[0][3],
			a[0][1]*b[0][0] + a[1][1]*b[0][1] + a[2][1]*b[0][2] + a[3][1]*b[0][3],
			a[0][2]*b[0][0] + a[1][2]*b[0][1] + a[2][2]*b[0][2] + a[3][2]*b[0][3],
			a[0][3]*b[0][0] + a[1][3]*b[0][1] + a[2][3]*b[0][2] + a[3][3]*b[0][3],
		},
		{
			a[0][0]*b[1][0] + a[1][0]*b[1][1] + a[2][0]*b[1][2] + a[3][0]*b[1][3],
			a[0][1]*b[1][0] + a[1][1]*b[1][1] + a[2][1]*b[1][2] + a[3][1]*b[1][3],
			a[0][2]*b[1][0] + a[1][2]*b[1][1] + a[2][2]*b[1][2] + a[3][2]*b[1][3],
			a[0][3]*b[1][0] + a[1][3]*b[1][1] + a[2][3]*b[1][2] + a[3][3]*b[1][3],
		},
		{
			a[0][0]*b[2][0] + a[1][0]*b[2][1] + a[2][0]*b[2][2] + a[3][0]*b[2][3],
			a[0][1]*b[2][0] + a[1][1]*b[2][1] + a[2][1]*b[2][2] + a[3][1]*b[2][3],
			a[0][2]*b[2][0] + a[1][2]*b[2][1] + a[2][2]*b[2][2] + a[3][2]*b[2][3],
			a[0][3]*b[2][0] + a[1][3]*b[2][1] + a[2][3]*b[2][2] + a[3][3]*b[2][3],
		},
		{
			a[0][0]*b[3][0] + a[1][0]*b[3][1] + a[2][0]*b[3][2] + a[3][0]*b[3][3],
			a[0][1]*b[3][0] + a[1][1]*b[3][1] + a[2][1]*b[3][2] + a[3][1]*b[3][3],
			a[0][2]*b[3][0] + a[1][2]*b[3][1] + a[2][2]*b[3][2] + a[3][2]*b[3][3],
			a[0][3]*b[3][0] + a[1][3]*b[3][1] + a[2][3]*b[3][2] + a[3][3]*b[3][3],
		},
	}
	return m
}

// Ortho sets m to an orthographic projection matrix with the given clipping
// planes and returns m.
func (m *Mat4) Ortho(left, right, bottom, top, near, far float32) *Mat4 {
	dx := left - right
	dy := bottom - top
	dz := near - far
	*m = Mat4{
		{-2 / dx, 0, 0, 0},
		{0, -2 / dy, 0, 0},
		{0, 0, 2 / dz, 0},
		{(left + right) / dx, (top + bottom) / dy, (far + near) / dz, 1},
	}
	return m
}

// Frustum sets m to a frustum matrix with the given clipping planes and
// returns m.
func (m *Mat4) Frustum(left, right, bottom, top, near, far float32) *Mat4 {
	dx := right - left
	dy := top - bottom
	dz := near - far
	*m = Mat4{
		{(2 * near) / dx, 0, 0, 0},
		{0, (2 * near) / dy, 0, 0},
		{(left + right) / dx, (top + bottom) / dy, (far + near) / dz, -1},
		{0, 0, (2 * far * near) / dz, 0},
	}
	return m
}

// Perspective sets m to a perspective matrix with the given vertical field of
// view angle (in radians), aspect ratio, near and far bounds of the frustum,
// and returns m.
func (m *Mat4) Perspective(fovy, aspect, near, far float32) *Mat4 {
	f := 1 / float32(math.Tan(float64(fovy/2)))
	dz := near - far
	*m = Mat4{
		{f / aspect, 0, 0, 0},
		{0, f, 0, 0},
		{0, 0, (far + near) / dz, -1},
		{0, 0, (2 * far * near) / dz, 0},
	}
	return m
}

// LookAt sets m to a viewing matrix given an eye point, a reference point
// indicating the center of the scene and an up vector, and returns m.
func (m *Mat4) LookAt(eye, center, up Vec3) *Mat4 {
	vz := eye.Sub(center).Norm()
	vx := up.Cross(vz).Norm()
	vy := vz.Cross(vx)
	*m = Mat4{
		{vx.X, vy.X, vz.X, 0},
		{vx.Y, vy.Y, vz.Y, 0},
		{vx.Z, vy.Z, vz.Z, 0},
		{-vx.Dot(eye), -vy.Dot(eye), -vz.Dot(eye), 1},
	}
	return m
}

// Rot sets m to the rotation of matrix a by the given angle in radians around
// the given axis, and returns m.
func (m *Mat4) Rot(a *Mat4, angle float32, axis Vec3) *Mat4 {
	c := float32(math.Cos(float64(angle)))
	s := float32(math.Sin(float64(angle)))
	t := 1 - c
	n := axis.Norm()
	b := Mat4{
		{n.X*n.X*t + c, n.Y*n.X*t + n.Z*s, n.Z*n.X*t - n.Y*s, 0},
		{n.X*n.Y*t - n.Z*s, n.Y*n.Y*t + c, n.Z*n.Y*t + n.X*s, 0},
		{n.X*n.Z*t + n.Y*s, n.Y*n.Z*t - n.X*s, n.Z*n.Z*t + c, 0},
		{0, 0, 0, 1},
	}
	return m.Mul(a, &b)
}

// T sets m to the transpose of matrix a and returns m.
func (m *Mat4) T(a *Mat4) *Mat4 {
	*m = Mat4{
		{a[0][0], a[1][0], a[2][0], a[3][0]},
		{a[0][1], a[1][1], a[2][1], a[3][1]},
		{a[0][2], a[1][2], a[2][2], a[3][2]},
		{a[0][3], a[1][3], a[2][3], a[3][3]},
	}
	return m
}

// Scale sets m to the scaling of matrix a by the scale factors of v and
// returns m.
func (m *Mat4) Scale(a *Mat4, v Vec3) *Mat4 {
	*m = Mat4{
		{a[0][0] * v.X, a[0][1] * v.X, a[0][2] * v.X, a[0][3] * v.X},
		{a[1][0] * v.Y, a[1][1] * v.Y, a[1][2] * v.Y, a[1][3] * v.Y},
		{a[2][0] * v.Z, a[2][1] * v.Z, a[2][2] * v.Z, a[2][3] * v.Z},
		{a[3][0], a[3][1], a[3][2], a[3][3]},
	}
	return m
}

// Translate sets m to the translation of matrix a by the vector v and
// returns m.
func (m *Mat4) Translate(a *Mat4, v Vec3) *Mat4 {
	*m = Mat4{
		{a[0][0], a[0][1], a[0][2], a[0][3]},
		{a[1][0], a[1][1], a[1][2], a[1][3]},
		{a[2][0], a[2][1], a[2][2], a[2][3]},
		{
			a[0][0]*v.X + a[1][0]*v.Y + a[2][0]*v.Z + a[3][0],
			a[0][1]*v.X + a[1][1]*v.Y + a[2][1]*v.Z + a[3][1],
			a[0][2]*v.X + a[1][2]*v.Y + a[2][2]*v.Z + a[3][2],
			a[0][3]*v.X + a[1][3]*v.Y + a[2][3]*v.Z + a[3][3],
		},
	}
	return m
}

// Floats returns a pointer to the matrix elements represented as a flat
// array of float32 numbers in row-major order. Changing an element value
// of this array will affect m and vice versa.
func (m *Mat4) Floats() *[16]float32 {
	return (*[16]float32)(unsafe.Pointer(m))
}

// lerp returns the linear interpolation between a and b by amount t.
// The amount t is usually a value between 0 and 1. If t=0 a will be returned;
// if t=1 b will be returned.
func lerp(a, b, t float32) float32 {
	return a + (b-a)*t
}

const epsilon = 1e-5

// nearEq compares two floating-point numbers for equality within an
// absolute difference tolerance of epsilon.
// This relation is not transitive, except for ε=0.
func nearEq(a, b, ε float32) bool {
	return float32(math.Abs(float64(a-b))) <= ε
}

// str converts a float32 to a string in "%g" format.
func str(f float32) string {
	return strconv.FormatFloat(float64(f), 'g', -1, 32)
}

// x is the radians<->degrees conversion factor.
const x = math.Pi / 180

// Deg converts the measurement of an angle from radians to degrees.
func Deg(rad float32) float32 {
	return rad / x
}

// Rad converts the measurement of an angle from degrees to radians.
func Rad(deg float32) float32 {
	return deg * x
}

func CalculateLine(x1, y1, x2, y2 int) []image.Point {

	reverse := false
	points := make([]image.Point, 0)

	var dx, dy, e, slope int

	// Because drawing p1 -> p2 is equivalent to draw p2 -> p1,
	// I sort points in x-axis order to handle only half of possible cases.
	if x1 > x2 {
		x1, y1, x2, y2 = x2, y2, x1, y1
		reverse = true
	}

	dx, dy = x2-x1, y2-y1
	// Because point is x-axis ordered, dx cannot be negative
	if dy < 0 {
		dy = -dy
	}

	switch {

	// Is line a point ?
	case x1 == x2 && y1 == y2:
		points = append(points, image.Point{
			X: x1,
			Y: y1,
		})

	// Is line an horizontal ?
	case y1 == y2:
		for ; dx != 0; dx-- {
			points = append(points, image.Point{
				X: x1,
				Y: y1,
			})
			x1++
		}
		points = append(points, image.Point{
			X: x1,
			Y: y1,
		})

	// Is line a vertical ?
	case x1 == x2:
		if y1 > y2 {
			y1, _ = y2, y1 // y2 (original y1) is not used in this block after swap
			reverse = true
		}
		for ; dy != 0; dy-- {
			points = append(points, image.Point{
				X: x1,
				Y: y1,
			})
			y1++
		}
		points = append(points, image.Point{
			X: x1,
			Y: y1,
		})

	// Is line a diagonal ?
	case dx == dy:
		if y1 < y2 {
			for ; dx != 0; dx-- {
				points = append(points, image.Point{
					X: x1,
					Y: y1,
				})
				x1++
				y1++
			}
		} else {
			for ; dx != 0; dx-- {
				points = append(points, image.Point{
					X: x1,
					Y: y1,
				})
				x1++
				y1--
			}
		}
		points = append(points, image.Point{
			X: x1,
			Y: y1,
		})

	// wider than high ?
	case dx > dy:
		if y1 < y2 {
			// BresenhamDxXRYD(img, x1, y1, x2, y2, col)
			dy, e, slope = 2*dy, dx, 2*dx
			for ; dx != 0; dx-- {
				points = append(points, image.Point{
					X: x1,
					Y: y1,
				})
				x1++
				e -= dy
				if e < 0 {
					y1++
					e += slope
				}
			}
		} else {
			// BresenhamDxXRYU(img, x1, y1, x2, y2, col)
			dy, e, slope = 2*dy, dx, 2*dx
			for ; dx != 0; dx-- {
				points = append(points, image.Point{
					X: x1,
					Y: y1,
				})
				x1++
				e -= dy
				if e < 0 {
					y1--
					e += slope
				}
			}
		}
		points = append(points, image.Point{
			X: x2,
			Y: y2,
		})

	// higher than wide.
	default:
		if y1 < y2 {
			// BresenhamDyXRYD(img, x1, y1, x2, y2, col)
			dx, e, slope = 2*dx, dy, 2*dy
			for ; dy != 0; dy-- {
				points = append(points, image.Point{
					X: x1,
					Y: y1,
				})
				y1++
				e -= dx
				if e < 0 {
					x1++
					e += slope
				}
			}
		} else {
			// BresenhamDyXRYU(img, x1, y1, x2, y2, col)
			dx, e, slope = 2*dx, dy, 2*dy
			for ; dy != 0; dy-- {
				points = append(points, image.Point{
					X: x1,
					Y: y1,
				})
				y1--
				e -= dx
				if e < 0 {
					x1++
					e += slope
				}
			}
		}
		points = append(points, image.Point{
			X: x2,
			Y: y2,
		})
	}

	if reverse {
		slices.Reverse(points)
		return points
	}
	return points
}
