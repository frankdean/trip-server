--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

SET search_path = public, pg_catalog;

--
-- Data for Name: georef_format; Type: TABLE DATA; Schema: public; Owner: -
--

COPY georef_format (key, value, ord) FROM stdin;
%d°%M′%S″%c	DMS+	1
%d°%M′%c	DM+	2
%d°%c	D+	3
%i%d	D	4
%p%d	±D	5
plus+code	OLC plus+code	6
%dd%M'%S"%c	Proj4	7
%c%D° %M	QLandkarte GT	8
%c%d°%M′%S″	+DMS	9
%c%d°%M′\\	+DM	10
%c%d°	+D	11
%d° %M′ %S″ %c	D M S +	12
%d° %M′ %c	D M +	13
%d° %c	D +	14
%c %d° %M′ %S″	+ D M S	15
%c %d° %M′	+ D M	16
%c %d°	+ D	17
%d %m %s%c	Plain DMS+	17
%d %m%c	Plain DM+	18
%d%c	Plain D+	19
%c%d %m %s	Plain +DMS	20
%c%d %m	Plain +DM	21
%c%d	Plain +D	22
\.


--
-- PostgreSQL database dump complete
--

