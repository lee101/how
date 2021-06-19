title: Optimizing python code
date: 2016-02-26 08:59:32
tags:
- python
- performance
- code review
thumbnailImagePosition: left
autoThumbnailImage: yes
---
```python
def is_letter(character):
    return character in 
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
```
I noticed this function would loop from a-Z so we should speed that up using a set!
<!-- more -->

First is it slow?

```
In [5]: %timeit is_letter(';')
10000000 loops, best of 3: 155 ns per loop
```

I guess not it took 1 second to do ~10M on its worst case input

But we should be able to speed it up using a set (one hash lookup rather than looking at all 52 things)


```python
def is_letter(character):
    return character in 
        set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
```

```
In [7]: %timeit is_letter(';')
100000 loops, best of 3: 2.29 µs per loop
```

Okay so thats ~20x slower because it constructs a set on every loop.

lets fix that

```
letters = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
def is_letter(character):
    return character in letters
```

```
In [9]: %timeit is_letter(';')
10000000 loops, best of 3: 141 ns per loop
```

So thats roughly 10% faster!


It can be easy to trip up trying to optimize code.

Its also easy to achieve underwhelming results.

Writing hard to detect bugs or slowing things down are a possibility, be sure to profile things on similar inputs to what you expect and test your code!

note: you can just use
`character.isalpha()` it has similar performance
