title: How to build a retaining wall
date: 2015-06-24 08:59:32
tags: 
- Python
- Dynamic Programming
- Algorithms
- Recursion
---

When we moved into our first house we inherited a half finished retaining wall.

We had posts already built, 
eventually we where kindly gifted some wood planks represented as a list of lengths `wood_lengths`
to finish the retaining wall we had to cut the planks to get planks of all the lengths we require, 
so we had another list of lengths `required_lengths`.

We want to use as few cuts as possible because we are lazy programmers.

Task: write an algorithm to find the list of cuts you should make.

A cut can be described as:
 
 
 `wood_num` is the index of the length of wood to cut from in `wood_lengths` 
 `cut_amount` the length of wood to cut from this `wood_num`
 
 e.g.
 
 ```
 {
    'wood_num': 0,
    'cut_amount': 10,
 }
 ```
 describes cutting a plank of length 10 from `wood_lengths[0]`

test cases:

```
wood_lengths=[6] required_lengths=[2, 2, 2] -> [
    {
        'wood_num': 0,
        'cut_amount': 2,
    },
    {
        'wood_num': 0,
        'cut_amount': 2,
    },
]
wood_lengths=[2, 4, 6] required_lengths=[2, 2, 2] -> [
    {
        'wood_num': 1,
        'cut_amount': 2,
    },
]
```

Finding an optimal solution means generating all valid possibilities and taking the one with optimal output (with the smallest amount of cuts in this case).

One strategy for trying all possibilities is to imagine:
&nbsp;&nbsp; for `required_lengths[0]` we could take the cut from any length in `wood_lengths`
&nbsp;&nbsp;&nbsp;&nbsp; for `required_lengths[1]` we could take the cut from any length in `wood_lengths`
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ...


This recursive algorithm would run generate a recursive call tree with `len(wood_lengths)` branches at each step and `len(required_lengths)` deep
 so it would take atleast $O( len(wood\\_lengths) ^ {len(required\\_lengths)} )$ time.
 
There are some conditions where you could prune this recursive call tree: 
you can't take a cut of size N from a wood_length less than N.
you don't need to consider cutting a length from a duplicate size
only consider non duplicate wood lengths (If you have planks A and B both of size N then you could take a cut from either, it would be equivalent)




$a = b + c$
{% math_block %}
\begin{aligned}
\dot{x} & = \sigma(y-x) \\
\dot{y} & = \rho x - y - xz \\
\dot{z} & = -\beta z + xy
\end{aligned}
{% endmath_block %}

Secondly we want to minimize waste (we want nice long offcuts we can use for other things).

How should we define waste?
Well we know we want to build another retaining wall which will have similar distances between posts (and thus similar `required_lengths`)
As a heuristic we know we will only be able to use a leftover plank if its at least the smallest length in `required_lengths`

This means we can define waste as the amount of times you can cut the smallest `required_length` out of your remaining planks (actually that's how much reuse you get waste is the inverse)

