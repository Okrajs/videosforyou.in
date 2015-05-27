# -*- indent-tabs-mode:t; -*-
# Makefile tutorial: http://mrbook.org/blog/tutorials/make/

all:
	xdg-open http://localhost:8080 &
	python -m SimpleHTTPServer 8080

