--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: georef_format; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE georef_format (
    key text NOT NULL,
    value text NOT NULL,
    ord integer NOT NULL
);


--
-- Name: itinerary; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE itinerary (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    user_id integer NOT NULL,
    archived boolean DEFAULT false,
    start timestamp with time zone,
    finish timestamp with time zone
);


--
-- Name: itinerary_route; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE itinerary_route (
    id integer NOT NULL,
    itinerary_id integer NOT NULL,
    name text,
    distance numeric(12,2),
    ascent numeric(9,1),
    descent numeric(9,1),
    lowest numeric(8,1),
    highest numeric(8,1),
    color text
);


--
-- Name: itinerary_route_point; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE itinerary_route_point (
    id integer NOT NULL,
    itinerary_route_id integer NOT NULL,
    "position" point NOT NULL,
    name text,
    comment text,
    description text,
    symbol text,
    altitude numeric(11,5)
);


--
-- Name: itinerary_route_point_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE itinerary_route_point_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itinerary_route_point_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE itinerary_route_point_seq OWNED BY itinerary_route_point.id;


--
-- Name: itinerary_route_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE itinerary_route_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itinerary_route_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE itinerary_route_seq OWNED BY itinerary_route.id;


--
-- Name: itinerary_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE itinerary_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itinerary_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE itinerary_seq OWNED BY itinerary.id;


--
-- Name: itinerary_sharing; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE itinerary_sharing (
    itinerary_id integer NOT NULL,
    shared_to_id integer NOT NULL,
    active boolean
);


--
-- Name: itinerary_track; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE itinerary_track (
    id integer NOT NULL,
    itinerary_id integer NOT NULL,
    name text,
    color text,
    distance numeric(12,2),
    ascent numeric(9,1),
    descent numeric(9,1),
    lowest numeric(8,1),
    highest numeric(8,1)
);


--
-- Name: itinerary_track_point; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE itinerary_track_point (
    id integer NOT NULL,
    itinerary_track_segment_id integer NOT NULL,
    "position" point NOT NULL,
    "time" timestamp with time zone,
    hdop numeric(6,1),
    altitude numeric(11,5)
);


--
-- Name: itinerary_track_point_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE itinerary_track_point_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itinerary_track_point_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE itinerary_track_point_seq OWNED BY itinerary_track_point.id;


--
-- Name: itinerary_track_segment; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE itinerary_track_segment (
    id integer NOT NULL,
    itinerary_track_id integer NOT NULL
);


--
-- Name: itinerary_track_segment_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE itinerary_track_segment_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itinerary_track_segment_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE itinerary_track_segment_seq OWNED BY itinerary_track_segment.id;


--
-- Name: itinerary_track_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE itinerary_track_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itinerary_track_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE itinerary_track_seq OWNED BY itinerary_track.id;


--
-- Name: itinerary_waypoint; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE itinerary_waypoint (
    id integer NOT NULL,
    itinerary_id integer NOT NULL,
    name text,
    "position" point NOT NULL,
    "time" timestamp with time zone,
    comment text,
    symbol text,
    altitude numeric(11,5),
    description text,
    color text,
    type text,
    avg_samples integer
);


--
-- Name: itinerary_waypoint_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE itinerary_waypoint_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: itinerary_waypoint_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE itinerary_waypoint_seq OWNED BY itinerary_waypoint.id;


--
-- Name: location_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE location_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: location; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE location (
    id integer DEFAULT nextval('location_seq'::regclass) NOT NULL,
    user_id integer NOT NULL,
    location point NOT NULL,
    "time" timestamp with time zone DEFAULT now() NOT NULL,
    hdop numeric(6,1),
    altitude numeric(11,5),
    speed numeric(6,1),
    bearing numeric(11,5),
    sat smallint,
    provider text,
    battery numeric(4,1),
    note text
);


--
-- Name: location_sharing; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE location_sharing (
    shared_by_id integer NOT NULL,
    shared_to_id integer NOT NULL,
    recent_minutes integer,
    max_minutes integer,
    active boolean
);


--
-- Name: path_color; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE path_color (
    key text NOT NULL,
    value text NOT NULL,
    html_code text
);


--
-- Name: role; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE role (
    id integer NOT NULL,
    name text NOT NULL
);


--
-- Name: role_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE role_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE role_seq OWNED BY role.id;


--
-- Name: tile; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE tile (
    server_id integer DEFAULT 0 NOT NULL,
    x integer NOT NULL,
    y integer NOT NULL,
    z smallint NOT NULL,
    image bytea,
    updated timestamp without time zone DEFAULT now() NOT NULL,
    expires timestamp without time zone NOT NULL
);


--
-- Name: tile_download_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE tile_download_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tile_metric; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE tile_metric (
    "time" timestamp with time zone DEFAULT now() NOT NULL,
    count integer NOT NULL
);


--
-- Name: user_role; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE user_role (
    user_id integer NOT NULL,
    role_id integer NOT NULL
);


--
-- Name: usertable_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE usertable_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usertable; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE usertable (
    id integer DEFAULT nextval('usertable_seq'::regclass) NOT NULL,
    firstname text NOT NULL,
    lastname text NOT NULL,
    email text NOT NULL,
    uuid uuid NOT NULL,
    password text NOT NULL,
    nickname text NOT NULL
);


--
-- Name: waypoint_symbol; Type: TABLE; Schema: public; Owner: -; Tablespace: 
--

CREATE TABLE waypoint_symbol (
    key text NOT NULL,
    value text NOT NULL
);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary ALTER COLUMN id SET DEFAULT nextval('itinerary_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_route ALTER COLUMN id SET DEFAULT nextval('itinerary_route_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_route_point ALTER COLUMN id SET DEFAULT nextval('itinerary_route_point_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_track ALTER COLUMN id SET DEFAULT nextval('itinerary_track_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_track_point ALTER COLUMN id SET DEFAULT nextval('itinerary_track_point_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_track_segment ALTER COLUMN id SET DEFAULT nextval('itinerary_track_segment_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_waypoint ALTER COLUMN id SET DEFAULT nextval('itinerary_waypoint_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY role ALTER COLUMN id SET DEFAULT nextval('role_seq'::regclass);


--
-- Name: georef_format_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY georef_format
    ADD CONSTRAINT georef_format_pkey PRIMARY KEY (key);


--
-- Name: georef_format_value_key; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY georef_format
    ADD CONSTRAINT georef_format_value_key UNIQUE (value);


--
-- Name: itinerary_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY itinerary
    ADD CONSTRAINT itinerary_pkey PRIMARY KEY (id);


--
-- Name: itinerary_route_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY itinerary_route
    ADD CONSTRAINT itinerary_route_pkey PRIMARY KEY (id);


--
-- Name: itinerary_route_point_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY itinerary_route_point
    ADD CONSTRAINT itinerary_route_point_pkey PRIMARY KEY (id);


--
-- Name: itinerary_sharing_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY itinerary_sharing
    ADD CONSTRAINT itinerary_sharing_pkey PRIMARY KEY (itinerary_id, shared_to_id);


--
-- Name: itinerary_track_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY itinerary_track
    ADD CONSTRAINT itinerary_track_pkey PRIMARY KEY (id);


--
-- Name: itinerary_track_point_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY itinerary_track_point
    ADD CONSTRAINT itinerary_track_point_pkey PRIMARY KEY (id);


--
-- Name: itinerary_track_segment_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY itinerary_track_segment
    ADD CONSTRAINT itinerary_track_segment_pkey PRIMARY KEY (id);


--
-- Name: itinerary_waypoint_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY itinerary_waypoint
    ADD CONSTRAINT itinerary_waypoint_pkey PRIMARY KEY (id);


--
-- Name: location_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY location
    ADD CONSTRAINT location_pkey PRIMARY KEY (id);


--
-- Name: location_sharing_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY location_sharing
    ADD CONSTRAINT location_sharing_pkey PRIMARY KEY (shared_by_id, shared_to_id);


--
-- Name: role_name_key; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY role
    ADD CONSTRAINT role_name_key UNIQUE (name);


--
-- Name: role_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY role
    ADD CONSTRAINT role_pkey PRIMARY KEY (id);


--
-- Name: tile_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY tile
    ADD CONSTRAINT tile_pkey PRIMARY KEY (server_id, x, y, z);


--
-- Name: track_color_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY path_color
    ADD CONSTRAINT track_color_pkey PRIMARY KEY (key);


--
-- Name: track_color_value_key; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY path_color
    ADD CONSTRAINT track_color_value_key UNIQUE (value);


--
-- Name: user_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY user_role
    ADD CONSTRAINT user_role_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: usertable_email_key; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY usertable
    ADD CONSTRAINT usertable_email_key UNIQUE (email);


--
-- Name: usertable_nickname_key; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY usertable
    ADD CONSTRAINT usertable_nickname_key UNIQUE (nickname);


--
-- Name: usertable_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY usertable
    ADD CONSTRAINT usertable_pkey PRIMARY KEY (id);


--
-- Name: usertable_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY usertable
    ADD CONSTRAINT usertable_uuid_key UNIQUE (uuid);


--
-- Name: waypoint_symbol_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY waypoint_symbol
    ADD CONSTRAINT waypoint_symbol_pkey PRIMARY KEY (key);


--
-- Name: waypoint_symbol_value_key; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace: 
--

ALTER TABLE ONLY waypoint_symbol
    ADD CONSTRAINT waypoint_symbol_value_key UNIQUE (value);


--
-- Name: idx_time_inverse; Type: INDEX; Schema: public; Owner: -; Tablespace: 
--

CREATE INDEX idx_time_inverse ON location USING btree (id, "time" DESC);

ALTER TABLE location CLUSTER ON idx_time_inverse;


--
-- Name: itinerary_route_itinerary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_route
    ADD CONSTRAINT itinerary_route_itinerary_id_fkey FOREIGN KEY (itinerary_id) REFERENCES itinerary(id) ON DELETE CASCADE;


--
-- Name: itinerary_route_point_itinerary_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_route_point
    ADD CONSTRAINT itinerary_route_point_itinerary_route_id_fkey FOREIGN KEY (itinerary_route_id) REFERENCES itinerary_route(id) ON DELETE CASCADE;


--
-- Name: itinerary_sharing_itinerary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_sharing
    ADD CONSTRAINT itinerary_sharing_itinerary_id_fkey FOREIGN KEY (itinerary_id) REFERENCES itinerary(id) ON DELETE CASCADE;


--
-- Name: itinerary_sharing_shared_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_sharing
    ADD CONSTRAINT itinerary_sharing_shared_to_id_fkey FOREIGN KEY (shared_to_id) REFERENCES usertable(id) ON DELETE CASCADE;


--
-- Name: itinerary_track_itinerary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_track
    ADD CONSTRAINT itinerary_track_itinerary_id_fkey FOREIGN KEY (itinerary_id) REFERENCES itinerary(id) ON DELETE CASCADE;


--
-- Name: itinerary_track_point_itinerary_track_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_track_point
    ADD CONSTRAINT itinerary_track_point_itinerary_track_segment_id_fkey FOREIGN KEY (itinerary_track_segment_id) REFERENCES itinerary_track_segment(id) ON DELETE CASCADE;


--
-- Name: itinerary_track_segment_itinerary_track_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_track_segment
    ADD CONSTRAINT itinerary_track_segment_itinerary_track_id_fkey FOREIGN KEY (itinerary_track_id) REFERENCES itinerary_track(id) ON DELETE CASCADE;


--
-- Name: itinerary_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary
    ADD CONSTRAINT itinerary_user_id_fkey FOREIGN KEY (user_id) REFERENCES usertable(id);


--
-- Name: itinerary_waypoint_itinerary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY itinerary_waypoint
    ADD CONSTRAINT itinerary_waypoint_itinerary_id_fkey FOREIGN KEY (itinerary_id) REFERENCES itinerary(id) ON DELETE CASCADE;


--
-- Name: location_sharing_shared_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY location_sharing
    ADD CONSTRAINT location_sharing_shared_by_id_fkey FOREIGN KEY (shared_by_id) REFERENCES usertable(id) ON DELETE CASCADE;


--
-- Name: location_sharing_shared_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY location_sharing
    ADD CONSTRAINT location_sharing_shared_to_id_fkey FOREIGN KEY (shared_to_id) REFERENCES usertable(id) ON DELETE CASCADE;


--
-- Name: location_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY location
    ADD CONSTRAINT location_user_id_fkey FOREIGN KEY (user_id) REFERENCES usertable(id);


--
-- PostgreSQL database dump complete
--

