#!/bin/sh

scale=50%

convert -scale $scale virtuele_memo_page0.png Route.png
convert -scale $scale virtuele_memo_page1.png RouteVisited.png
convert -scale $scale virtuele_memo_page2.png RouteGift.png

file Route.png
