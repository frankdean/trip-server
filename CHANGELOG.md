<!-- -*- mode: markdown; -*- vim: set tw=78 ts=4 sts=0 sw=4 noet ft=markdown norl: -->

# Changelog

## v1.4.0

* Implemented upload and download of
  [TripLogger iOS client app][trip-web-client]
  settings

	A new column has been added to the `usertable` table to support this
	functionality.  The following SQL statement needs to be executed in the
	`trip` database:

		ALTER TABLE usertable ADD COLUMN IF NOT EXISTS tl_settings text;

* Options to import and export full itinerary, including text and sharing.

* Option to create a duplicate copy of an itinerary.

* Where the start and finish dates of an itinerary being viewed relate to a
  different time zone, show the time alongside the date on the itinerary page
  to clarify, otherwise it can appear the dates differ by a day in some
  circumstances.

* Optionally using YAML instead of JSON for the TRIP configuration file.

	The existing `config.json` script can be converted to `config.yaml` with
    `yarn run config2yaml`.

* Bug fix - pasting waypoints into an itinerary didn't necessarily create them
  in time order.

[trip-web-client]: https://www.fdsd.co.uk/trip-web-client-docs/

## v1.3.0

- Asynchronously load elevation data on startup

## v1.2.0

- Bug fix - request never completed when deleting waypoint
- Fixed logging not formatting log statements with more than one parameter
- Correction to example config file for log.timestamp entry
- Set locale and time zone in Vagrant startup
- Support Docker deployment
- Handle root URL GET request when running in Docker container
- Replace Winston logger with simple implementation following RFC5424
- Changed autoquit to only quit when app.autoQuit.timeOut is a positive value
- Disable using OSM tile server until configured properly
- Graceful handling when no tile provider configured
- Added nodemon to restart the server during development

## v1.1.5

- Re-implemented itinerary search results to provide more detailed results

## v1.1.4

- Bug fix - route length not recalculated when points deleted
- Only relates to deleting points as part of the client 'Edit path' functionality.

## v1.1.3

- Updated Vagrant to use trip-web-client 1.1.3

    No actual code changes affecting the deployed server.

## v1.1.2

- Prune expired tiles from cache
- Updated Vagrant to use Debian 10.1 and Node.js version 10.17.0

## v1.1.1

- Update required version of lodash due to vulnerability, CVE-2019-10744.

    Vulnerable versions: < 4.17.13

## v1.1.0

- Searches for itineraries that contain waypoints, route points or track
  segment points within a specified distance.

    **Note:** This release also requires installing the PostGIS extension to
    PostgreSQL. See the 'Next Release' section of the trip-server README.

## v1.0.0

- Implemented user password change