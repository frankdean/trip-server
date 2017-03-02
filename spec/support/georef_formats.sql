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
%c%D° %M	QLandkarte GT	6
%dd%M'%S"%c	Proj4	7
%c%d°%M′%S″	+DMS	8
%c%d°%M′\\	+DM	9
%c%d°	+D	10
%d° %M′ %S″ %c	D M S +	11
%d° %M′ %c	D M +	12
%d° %c	D +	13
%c %d° %M′ %S″	+ D M S	14
%c %d° %M′	+ D M	15
%c %d°	+ D	16
%d %m %s%c	Plain DMS+	16
%d %m%c	Plain DM+	17
%d%c	Plain D+	18
%c%d %m %s	Plain +DMS	19
%c%d %m	Plain +DM	20
%c%d	Plain +D	21
\.


--
-- PostgreSQL database dump complete
--

