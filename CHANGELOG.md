<!-- -*- mode: markdown; -*- vim: set tw=78 ts=4 sts=0 sw=4 noet ft=markdown norl: -->

# Changelog

## v1.11.7

- Upgrade `engine.io-parser` re CVE-2023-32695

## v1.11.6

- Re-create `yarn.lock` re vulnerability in `engine.io`

## v1.11.5

- Rebuild `yarn.lock` re `yaml` package vulnerability
- Updated Vagrant and Docker environments to use Node.js v16

## v1.11.4

- Force resolution tor `xml2js` to v0.5.0 re vulnerability
- Upgrade `canvas` package to 2.11.x
- Re-create `yarn.lock` to update sub-depencencies

## v1.11.3

- Upgrade `jsonwebtoken` package re various CVEs
- Updated packages to latest versions by recreating `yarn.lock` files.

## v1.11.2

- Upgrade `socket.io` to `4.5.4` re CVE-2022-2421 and CVE-2022-41940
- Updated some other packages to later versions.

## v1.11.1

- Updated some packages to later versions.
- Update Vagrant to use Node.js 14.21.1

## v1.11.0

- Bug fix - Shared tracks were only constrained to the maximum period if a
  constraint value was entered for the most recently logged location.
- Updated `nodemon` package to latest version re security vulnerability in
  `got` package.
- Updated packages to latest versions by recreating `yarn.lock` files.

## v1.10.1

- Update packages to latest versions by recreating `yarn.lock` files,
  including updating `minimist` package re security vulnerability.
- Updated Vagrant configuration to use PostgreSQL version 13 and Node.js
  version 14.19.1.
- Updated Vagrant configuration for Chrome web driver to match current
  Debian 11 version.
- Configure workaround for errors when running Nginx in Vagrant.
- Fix failure in trip-web-client to fetch Leaflet.draw package from GitHub.

## v1.10.0

Updated to support Node.js v14.

- Updated `pg` package to latest.
- Fix double-release of pooled database connection.
- Lazy loading of elevation tiles.
- Updated packages re audit warnings.
- Rebuild `yarn.lock` files to update sub-dependencies to later versions.
- Updated deprecated Jasmine custom matchers used in tests.
- Updated Vagrant build to use Node.js v14 and Debian 11.

## v1.9.1

- Updated some packages to later versions including some with security
  vulnerabilities.
- Temporarily removed the `jsdoc` package, as version 3.6.7 had reported
  security vulnerabilities in some dependent packages.  Unfortunately version
  3.6.8 updates the `klaw` package which requires upgrading from Node.js 12.x
  to 14.x.

## v1.9.0

Implemented an option to simplify (reduce the number of points) of an
itinerary track.

Added a `goto page` option to all paging controls.  The `goto page` option is
only shown once there are at least 10 pages.

- Format numerical values with commas on `System Status` page.
- Update `nodemon` package to newer version.

## v1.8.1

Status page now shows map tile usage per month for the past 12 months.

- Updated Docker configurations and improved using Docker container
  for developement.
- When no map tile provider is defined, return tiles showing the x, y, z
  coordinates of the tile.  This may be useful during development if a
  tile server is not available.
- Show the last 12 months recorded tile usage on the admin status
  report.

## v1.8.0

- Implement option to convert itinerary tracks to routes.
- Implemented option to assign separate colours to a selection of routes and tracks.
- If no specific track name, uses the track name in the `section`
  attribute of the `ogr` namespace when importing GPX created by GDAL.

## v1.7.1

Updated some dependent packages, including updates for the `tar`
package re CVE-2021-37713 and the `jszip` package re CVE-2021-23413.

## v1.7.0

Minimum and maximum map zoom levels are now configurable by tile
provider.  Where these values are not set, they default to the
previous values with a minimum zoom of zero and maximum of 17.  Check
with your tile provider before using higher zoom levels than 17.
These configuration settings are `tile.providers.mapLayer.minZoom` and
`tile.providers.mapLayer.maxZoom`.  See `config-dist.yaml` for
examples.

Whether tiles should be cached or pruned is also configurable for each
tile provider.  If you are using your own tile server, you may prefer
to let the tile server handle caching.  Keeping stale tiles in the
database cache by disabling pruning could be useful in the event of a
tile provider service failing.  If fetching a remote tile fails, the
stale tile is served from the local cache, if available.  These
configuration settings are boolean values for `tile.providers.cache`
and `tile.providers.prune`.  When not specified, they default to the
previous values, with both caching and pruning being enabled (true).

Release builds now use `node-tar` and `adm-zip` packages instead of
external utilities.

## v1.6.1

Bug fix - failed to load elevation tif files after non-tif file
encountered in the same folder.  E.g. the elevation data directory
contains a hidden file like `.DS_Store` no tif files will be loaded.

Disabled elevation tests when elevation data not configured.

Updated to use newer version of xmlhttprequest-ssl re CVE-2020-28502.

Updated some packages to use newer versions.

Updated `jsdoc` to remove `underscore` vulnerability.

Can be built with either `npm` or `yarn`.  Implemented forced package
resolutions for `npm` (this feature is included in `yarn`).  If
`package-lock.json` doesn't already exist when `npm install` target is
first executed, `npm install` needs to be run a second time to force
the package resolutions.

Improvements to development environment with Vagrant.

Run unit and end-to-end tests with headless Chromium.

## v1.6.0

Replaced [node-static](https://github.com/cloudhead/node-static),
which appears to be no longer maintained, with
[send](https://github.com/pillarjs/send).

## v1.5.1

Bug fix - The count of itineraries was half the correct value when the
number of personal itineraries was identical to the number of shared
itineraries, causing an incorrect page count calculation.

## v1.5.0

Allow limiting Cross-Origin Resource Sharing (CORS).  This introduces
a configuration setting for `app.origins` - Valid origins to handle.
Typically this is the protocol, host domain and port,
e.g. `https://example.com:443`.  The default is `*:*` which currently
allows all origins to ensure backward compatibility.

See
	- [Socket.IO 2.4.0](https://socket.io/blog/socket-io-2-4-0/)
	- [CORS Misconfiguration in socket.io · Issue #3671 · socketio/socket.io](https://github.com/socketio/socket.io/issues/3671)
	- [Cross-Origin Resource Sharing (CORS)](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)

Show an alert on the live itinerary map when the websocket is
disconnected or fails to connect.

## v1.4.2

Update some dependent packages

## v1.4.1

Add tl_settings column to usertable in database schema

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
