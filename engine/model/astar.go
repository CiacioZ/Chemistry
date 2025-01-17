package model

import (
	"container/heap"
	"iter"
)

type set[Elem comparable] struct {
	data map[Elem]struct{}
}

// Add adds an element to a set.
func (s *set[Elem]) Add(v Elem) {
	if s.data == nil {
		s.data = make(map[Elem]struct{})
	}
	s.data[v] = struct{}{}
}

// Contains reports whether v is in the set.
func (s *set[Elem]) Contains(v Elem) bool {
	if s.data == nil {
		return false
	}
	_, ok := s.data[v]
	return ok
}

// An item is something we manage in a priority queue.
type item[T any] struct {
	value    T       // The value of the item; arbitrary.
	priority float64 // The priority of the item in the queue.
}

// A priorityQueue implements heap.Interface and holds items.
type priorityQueue[T any] []*item[T]

func (pq priorityQueue[T]) Len() int { return len(pq) }

func (pq priorityQueue[T]) Less(i, j int) bool {
	// We want heap.Pop to give us the item with the highest,
	// not lowest, priority so we use greater than here.
	return pq[i].priority > pq[j].priority
}

func (pq priorityQueue[T]) Swap(i, j int) {
	pq[i], pq[j] = pq[j], pq[i]
}

func (pq *priorityQueue[T]) Push(x any) {
	*pq = append(*pq, x.(*item[T]))
}

func (pq *priorityQueue[T]) Pop() any {
	old := *pq
	n := len(old)
	it := old[n-1]
	*pq = old[0 : n-1]
	return it
}

// The Graph interface is the minimal interface a graph data structure
// must satisfy to be suitable for the A* algorithm.
type Graph[Node any] interface {
	// Neighbours returns the neighbour nodes of node n in the graph.
	Neighbours(n Node) iter.Seq[Node]
}

// A CostFunc is a function that returns a cost for the transition
// from node a to node b.
type CostFunc[Node any] func(a, b Node) float64

// A Path is a sequence of nodes in a graph.
type Path[Node any] []Node

// newPath creates a new path with one start node. More nodes can be
// added with append().
func newPath[Node any](start Node) Path[Node] {
	return []Node{start}
}

// last returns the last node of path p. It is not removed from the path.
func (p Path[Node]) last() Node {
	return p[len(p)-1]
}

// cont creates a new path, which is a continuation of path p with the
// additional node n.
func (p Path[Node]) cont(n Node) Path[Node] {
	cp := make([]Node, len(p), len(p)+1)
	copy(cp, p)
	cp = append(cp, n)
	return cp
}

// Cost calculates the total cost of path p by applying the cost function d
// to all path segments and returning the sum.
func (p Path[Node]) Cost(d CostFunc[Node]) (c float64) {
	for i := 1; i < len(p); i++ {
		c += d(p[i-1], p[i])
	}
	return c
}

// FindPath finds the least-cost path between start and dest in graph g
// using the cost function d and the cost heuristic function h.
// Returns nil if no path was found.
func FindPath[Node comparable](g Graph[Node], start, dest Node, d, h CostFunc[Node]) Path[Node] {
	var closed set[Node]

	pq := &priorityQueue[Path[Node]]{}
	heap.Init(pq)
	heap.Push(pq, &item[Path[Node]]{value: newPath(start)})

	for pq.Len() > 0 {
		p := heap.Pop(pq).(*item[Path[Node]]).value
		n := p.last()
		if closed.Contains(n) {
			continue
		}
		if n == dest {
			// Path found
			return p
		}
		closed.Add(n)

		for nb := range g.Neighbours(n) {
			cp := p.cont(nb)
			heap.Push(pq, &item[Path[Node]]{
				value:    cp,
				priority: -(cp.Cost(d) + h(nb, dest)),
			})
		}
	}

	// No path found
	return nil
}
