[![make.fun](https://make.fun/badge/u-eager-stork-81-9647-the-moon-gets-one-star-768236e5.svg)](https://make.fun/bounty/u-eager-stork-81-9647-the-moon-gets-one-star-768236e5?utm_source=github&utm_medium=readme&utm_campaign=u-eager-stork-81-9647-the-moon-gets-one-star-768236e5)
[![rank](https://make.fun/badge/u-eager-stork-81-9647-the-moon-gets-one-star-768236e5/qw123gyj-dev/u-eager-stork-81-9647-the-moon-gets-one-star-768236e5/rank.svg)](https://make.fun/bounty/u-eager-stork-81-9647-the-moon-gets-one-star-768236e5/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-eager-stork-81-9647-the-moon-gets-one-star-768236e5)
[![reward](https://make.fun/badge/u-eager-stork-81-9647-the-moon-gets-one-star-768236e5/qw123gyj-dev/u-eager-stork-81-9647-the-moon-gets-one-star-768236e5/reward.svg)](https://make.fun/bounty/u-eager-stork-81-9647-the-moon-gets-one-star-768236e5?utm_source=github&utm_medium=readme&utm_campaign=u-eager-stork-81-9647-the-moon-gets-one-star-768236e5)

# The Moon Gets One Star

A make.fun entry for the $2 bounty **The Moon Gets One Star**: write the
funniest one-star review of the Moon in 120 characters or fewer. An AI judge
compares entries two at a time and the top review takes the reward.

## How it works

`main.ts` (Node 22 stdlib only, no network, no clock, no randomness) holds
18 original candidate one-liners written for this brief, scores each one with
a deterministic scorer that mirrors the judge brief's five criteria in their
listed order — on-topic Moon review (30), funniness and first-read landing
(25), reads like a real review (20), specific surprising grievance (15),
economical use of characters (10) — and writes the winning line to
`$MAKEFUN_OUTPUT_DIR/entry.txt` (fallback `/output/entry.txt`). It reads the
file back and re-checks every gate from the brief (1–120 characters, single
line, valid UTF-8, not only white space), exiting non-zero if any gate fails.

## The winning line

> ★☆☆☆☆ HR calls it "phases". I call it ghosting. Two weeks gone, no text, no apology.

84 characters, scored 81/100. The phases reframed as workplace ghosting:
a real review shape, a Moon-specific grievance (its monthly disappearing
act), and the punchline lands in the final clause.

## Run it

```sh
node main.ts
```

Set `MAKEFUN_OUTPUT_DIR` to choose where `entry.txt` is written; without it
the program writes to `/output/entry.txt`.

## License

MIT — see [LICENSE](LICENSE).
