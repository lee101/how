title: How to build a retaining wall
date: 2015-06-24 08:59:32
tags: Python, dynamic programming, algorithms
---

When we moved into our first house we inherited a half finished retaining wall.

We had posts already built, 
eventually we where kindly gifted some wood planks represented a list of lengths `wood_lengths`
to finish the retaining wall we had to cut the planks to fit nicely between the posts, 
so we had another list of lengths `required_lengths`.

First and foremost we want to use as few cuts as possible because we are lazy programmers.
Secondly we want to minimize waste.

How should we define waste? 
Well we know we want to build another retaining wall which will have similar distances between posts (and thus similar `required_lengths`)
So as a heuristic we know we will only be able to use a leftover plank if its atleast the smallest length in `required_lengths`

This means we can define waste as the amount of times you can cut the smallest `required_length` out of your remaining planks (actually that's how much reuse you get waste is the inverse)

