/**
 * @license TRIP - Trip Recording and Itinerary Planning application.
 * (c) 2016-2018 Frank Dean <frank@fdsd.co.uk>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

describe('utils.js', function() {

  var Utils = require('../utils.js');

  var testCoords = [
    [58.6083336607763, -5.03173828125],
    [57.3027896563501, -5.77880859375],
    [57.7276192162149, -6.39404296875],
    [57.4449494358398, -7.00927734375],
    [57.0407298383609, -5.95458984375],
    [56.4139013760068, -6.52587890625],
    [56.2433499241053, -5.91064453125],
    [56.6803737895014, -5.20751953125],
    [55.7765730186677, -6.39404296875],
    [55.5534954584537, -6.04248046875],
    [55.8999561440681, -5.73486328125],
    [55.4040698270061, -5.86669921875],
    [55.7518493917353, -5.33935546875],
    [55.5783446721821, -4.76806640625],
    [54.9271418645464, -5.20751953125],
    [54.6484125023167, -4.59228515625],
    [54.6992335284814, -3.97705078125],
    [54.9523856906336, -3.36181640625],
    [54.4700376128058, -3.71337890625],
    [54.0851734208868, -3.284912109375],
    [54.1495672125405, -2.845458984375],
    [53.6185793648952, -3.087158203125],
    [53.4095318530864, -3.306884765625],
    [53.2520688058941, -3.966064453125],
    [53.4880455360562, -4.339599609375],
    [53.3308729830171, -4.669189453125],
    [53.0940240550633, -4.471435546875],
    [52.8425945722395, -4.757080078125],
    [52.7495937267412, -4.822998046875],
    [52.8691297276852, -4.141845703125],
    [52.4827802220782, -4.163818359375],
    [52.2547088011308, -4.383544921875],
    [51.8629239136024, -5.306396484375],
    [51.63165734945, -5.086669921875]
  ];

  var testWaypoints = [
    {"id":"001","lng":"57.7276192162149","lat":"-6.39404296875","ele":"369.8", time: "2017-09-21T13:54:00.000Z"},
    {"id":"002","lng":"57.4449494358398","lat":"-7.00927734375","ele":"356.4", time: "2017-09-18T14:00:00.000Z"},
    {"id":"003","lng":"57.0407298383609","lat":"-5.95458984375","ele":"360.4"}
  ];

  var track1 = [
    {"lng":"58.6083336607763","lat":"-5.03173828125","ele":"389.3", time: "2017-09-18T13:54:00.000Z"},
    {"lng":"57.3027896563501","lat":"-5.77880859375","ele":"384.4", time: "2017-09-18T14:00:00.000Z"},
    {"lng":"57.7276192162149","lat":"-6.39404296875","ele":"369.8"},
    {"lng":"57.4449494358398","lat":"-7.00927734375","ele":"356.4"},
    {"lng":"57.0407298383609","lat":"-5.95458984375","ele":"360.4"},
    {"lng":"56.4139013760068","lat":"-6.52587890625","ele":"357"},
    {"lng":"56.2433499241053","lat":"-5.91064453125","ele":"362.4"}
  ],
      track2 = [
        {"lng":"56.6803737895014","lat":"-5.20751953125","ele":"367.2"},
        {"lng":"55.7765730186677","lat":"-6.39404296875","ele":"373.1"},
        {"lng":"55.5534954584537","lat":"-6.04248046875","ele":"369.8"},
        {"lng":"55.8999561440681","lat":"-5.73486328125","ele":"367.7"},
        {"lng":"55.4040698270061","lat":"-5.86669921875","ele":"351.4"},
        {"lng":"55.7518493917353","lat":"-5.33935546875","ele":"355.8"},
        {"lng":"55.5783446721821","lat":"-4.76806640625","ele":"355.2"},
        {"lng":"54.9271418645464","lat":"-5.20751953125","ele":"355.8"},
        {"lng":"54.6484125023167","lat":"-4.59228515625","ele":"355.8"},
        {"lng":"54.6992335284814","lat":"-3.97705078125","ele":"355.8"},
        {"lng":"54.9523856906336","lat":"-3.36181640625","ele":"357"},
        {"lng":"54.4700376128058","lat":"-3.71337890625","ele":"358"},
        {"lng":"54.0851734208868","lat":"-3.284912109375","ele":"359.5"},
        {"lng":"54.1495672125405","lat":"-2.845458984375","ele":"360.5"},
        {"lng":"53.6185793648952","lat":"-3.087158203125","ele":"363.1"},
        {"lng":"53.4095318530864","lat":"-3.306884765625","ele":"363.1"},
      ],

      track3 = [
        {"lng":"53.2520688058941","lat":"-3.966064453125","ele":"364.8"},
        {"lng":"53.4880455360562","lat":"-4.339599609375","ele":"369.9"},
        {"lng":"53.3308729830171","lat":"-4.669189453125","ele":"369.9"},
        {"lng":"53.0940240550633","lat":"-4.471435546875","ele":"372.4"},
        {"lng":"52.8425945722395","lat":"-4.757080078125","ele":"373.6"},
        {"lng":"52.7495937267412","lat":"-4.822998046875","ele":"374.8"},
        {"lng":"52.8691297276852","lat":"-4.141845703125","ele":"374.8"},
        {"lng":"52.4827802220782","lat":"-4.163818359375","ele":"374.8"},
        {"lng":"52.2547088011308","lat":"-4.383544921875","ele":"375.7"},
        {"lng":"51.8629239136024","lat":"-5.306396484375","ele":"375.7"},
        {"lng":"51.63165734945","lat":"-5.086669921875","ele":"382.7"}
      ],
      track4 = [
        {"lng":"58.6083336607763","lat":"-5.03173828125","ele":"10000"},
        {"lng":"57.3027896563501","lat":"-5.77880859375","ele":"10100"},
        {"lng":"57.7276192162149","lat":"-6.39404296875","ele":"10300"}, // 300m asc
        {"lng":"57.4449494358398","lat":"-7.00927734375","ele":"10200"}, // 100m desc
        {"lng":"57.0407298383609","lat":"-5.95458984375","ele":"9900"}, // 400m desc
        {"lng":"56.4139013760068","lat":"-6.52587890625","ele":"10000"}, // 400m asc
        {"lng":"56.2433499241053","lat":"-5.91064453125","ele":"9900"}  // 500m desc
      ];


  var testRoutes = [
    {
      "points": [],
      "name":"Test Route"
    }];
  testRoutes[0].points = track1.concat(track2, track3);
  testRoutes[1] = {points: track4};

  var testTracks = [
    {
      "segments": [
        {"points": track1},
        {"points": track2},
        {"points": track3}
      ],
      "name":"Test Track"
    }
  ];
  var myTrack = '{"id":1037,"name":"Pirbright track","color":"Red","htmlcolor":"red","distance":"12.14","ascent":"163.9","descent":"208.1","lowest":"32.3","highest":"94.4","segments":[';
  var testTracks2 = [
    {
      "id": "001",
      "name":"Test Track 1",
      "segments": [
        {"points": track1},
      ]
    },
    {
      "id": "002",
      "name":"Test Track 2",
      "segments": [
        {"points": track2},
      ]
    },
    {
      "id": "003",
      "name":"Test Track 3",
      "segments": [
        {"points": track3}
      ]
    },
  ];

  var testBounds = [
    [58.6083336607763, -5.03173828125, 57.3027896563501, -5.77880859375],
    [57.7276192162149, -6.39404296875, 57.4449494358398, -7.00927734375],
    undefined,
    null,
    [],
    [57.0407298383609, -5.95458984375, 56.4139013760068, -6.52587890625],
    [56.2433499241053, -5.91064453125, 56.6803737895014, -5.20751953125],
    [55.7765730186677, -6.39404296875, 55.5534954584537, -6.04248046875]
  ];

  var testBadRoutes = [{"points":[{"lat":"51","lng":"-1","ele":"rubbish"},
                                  {"lat":"52","lng":"-21","ele":"rubbish"}]},
                       {"points":[{"lat":"51","lng":"-1","ele":"rubbish"},
                                  {"lat":"52","lng":"-21","ele":"rubbish"},
                                  {"lat":"53","lng":"-10","ele":"100"},
                                  {"lat":"53.5","lng":"-10.5","ele":"150"}]},
                       {"points":[{"lat":"rubbish","lng":"-9","ele":"rubbish"},
                                  {"lat":"52","lng":"-21","ele":"rubbish"},
                                  {"lat": "53.5","lng":"-10.5","ele":"99"}]}];

  it('should calculate the length of a number of routes', function()  {
    Utils.fillDistanceElevationForRoutes(testRoutes);
    var r = testRoutes[0];
    expect(r.distance).toBeCloseTo(2303, 0);
    expect(r.lowest).toBeCloseTo(351.40, 2);
    expect(r.highest).toBeCloseTo(389.3, 2);
    expect(r.ascent).toBeCloseTo(52, 2);
    expect(r.descent).toBeCloseTo(58.6, 2);
  });

  it('should calculate the timespan for a number of routes', function()  {
    Utils.fillDistanceElevationForRoutes(testRoutes, {calcPoints: true});
    expect(testRoutes.startTime).toBeDefined();
    expect(testRoutes.endTime).toBeDefined();
    expect(new Date(testRoutes.startTime)).toEqual(new Date(track1[0].time));
    expect(new Date(testRoutes.endTime)).toEqual(new Date(track1[1].time));
  });

  it('should calculate the bounds of a number of routes', function()  {
    Utils.fillDistanceElevationForRoutes(testRoutes, {calcPoints: true});
    expect(testRoutes.bounds).toEqual([ '51.63165734945', '-7.00927734375', '58.6083336607763', '-2.845458984375' ]);
  });

  it('should calculate the length of a number of tracks', function()  {
    Utils.fillDistanceElevationForTracks(testTracks);
    var t = testTracks[0];
    expect(t.distance).toBeCloseTo(2303, 0);
    expect(t.lowest).toBeCloseTo(351.40, 2);
    expect(t.highest).toBeCloseTo(389.3, 2);
    expect(t.ascent).toBeCloseTo(52, 2);
    expect(t.descent).toBeCloseTo(58.6, 2);
  });

  it('should fill in individual bearing, distance and speed attributes', function()  {
    var p2;
    Utils.fillDistanceElevationForTracks(testTracks, {calcPoints: true});
    var t = testTracks[0];
    expect(t.distance).toBeCloseTo(2303, 0);
    expect(t.lowest).toBeCloseTo(351.40, 2);
    expect(t.highest).toBeCloseTo(389.3, 2);
    expect(t.ascent).toBeCloseTo(52, 2);
    expect(t.descent).toBeCloseTo(58.6, 2);
    expect(t.minSpeed).toBeCloseTo(1667, 0);
    expect(t.maxSpeed).toBeCloseTo(1667, 0);
    expect(t.avgSpeed).toBeCloseTo(23026, -2);
    expect(t.startTime.toISOString()).toEqual("2017-09-18T13:54:00.000Z");
    expect(t.endTime.toISOString()).toEqual("2017-09-18T14:00:00.000Z");
    p2 = t.segments[0].points[1];
    expect(p2.bearing).toBeCloseTo(240, 0);
    expect(p2.distance).toBeCloseTo(167, 0);
    expect(p2.speed).toBeCloseTo(1667, 0);
    expect(testTracks.bounds).toEqual(["51.63165734945","-7.00927734375","58.6083336607763","-2.845458984375"]);
  });

  it('should calculate the timespan for a number of routes', function()  {
    Utils.fillDistanceElevationForTracks(testTracks2, {calcPoints: true});
    var t = testTracks2;
    expect(t.startTime).toBeDefined();
    expect(t.endTime).toBeDefined();
    expect(new Date(t.startTime)).toEqual(new Date(track1[0].time));
    expect(new Date(t.endTime)).toEqual(new Date(track1[1].time));
  });

  it('should calculate the bounds of a number of tracks', function()  {
    var p2;
    Utils.fillDistanceElevationForTracks(testTracks2, {calcPoints: true});
    expect(testTracks2.bounds).toEqual(["51.63165734945", "-7.00927734375", "58.6083336607763", "-2.845458984375"]);
  });

  it('should calculate the length of a single bad route', function()  {
    Utils.fillDistanceElevationForPath(testBadRoutes[1]);
    expect(testBadRoutes[1].distance).toBeCloseTo(2201, -1);
    expect(testBadRoutes[1].lowest).toBeCloseTo(100, 2);
    expect(testBadRoutes[1].highest).toBeCloseTo(150, 2);
    expect(testBadRoutes[1].ascent).toBeCloseTo(50, 2);
    expect(testBadRoutes[1].descent).toBeCloseTo(0, 2);
  });

  it('should calculate the length of another single bad route', function()  {
    Utils.fillDistanceElevationForPath(testBadRoutes[2]);
    expect(testBadRoutes[2].distance).toBeNaN();
    expect(testBadRoutes[2].lowest).toBeCloseTo(99, 2);
    expect(testBadRoutes[2].highest).toBeCloseTo(99, 2);
    expect(testBadRoutes[2].ascent).toBeCloseTo(0, 2);
    expect(testBadRoutes[2].descent).toBeCloseTo(0, 2);
  });

  it('should calculate the length of a number of bad routes', function()  {
    Utils.fillDistanceElevationForRoutes(testBadRoutes);
    expect(testBadRoutes[0].distance).toBeCloseTo(1385, 0);

    expect(testBadRoutes[1].distance).toBeCloseTo(2201, -1);
    expect(testBadRoutes[1].lowest).toBeCloseTo(100, 2);
    expect(testBadRoutes[1].highest).toBeCloseTo(150, 2);
    expect(testBadRoutes[1].ascent).toBeCloseTo(50, 2);
    expect(testBadRoutes[1].descent).toBeCloseTo(0, 2);

    expect(testBadRoutes[2].distance).toBeNaN();
    expect(testBadRoutes[2].lowest).toBeCloseTo(99, 2);
    expect(testBadRoutes[2].highest).toBeCloseTo(99, 2);
    expect(testBadRoutes[2].ascent).toBeCloseTo(0, 2);
    expect(testBadRoutes[2].descent).toBeCloseTo(0, 2);
  });

  it('should calculate the timespan for a number of objects', function() {
    var testRange = [
      {startTime: new Date(2017, 0, 14, 12, 32, 0)},
      {endTime: new Date(2017, 0, 31, 14, 32, 0)},
      {startTime: new Date(2017, 0, 12, 12, 32, 0), endTime: new Date(2017, 0, 31, 12, 32, 0)}
    ],
        result = Utils.getTimeSpan(testRange);
    expect(result.startTime).toBeDefined();
    expect(result.endTime).toBeDefined();
    expect(new Date(result.startTime)).toEqual(testRange[2].startTime);
    expect(new Date(result.endTime)).toEqual(testRange[1].endTime);
  });

  it('should calculate the timespan of a number of waypoints', function() {
    var result = Utils.getTimeSpanForWaypoints(testWaypoints);
    expect(new Date(result.startTime)).toEqual(new Date(testWaypoints[1].time));
    expect(new Date(result.endTime)).toEqual(new Date(testWaypoints[0].time));
  });

  it('should return a timespan for one waypoint', function() {
    var result = Utils.getTimeSpanForWaypoints([testWaypoints[0]]);
    expect(new Date(result.startTime)).toEqual(new Date(testWaypoints[0].time));
    expect(new Date(result.endTime)).toEqual(new Date(testWaypoints[0].time));
  });

  it('should not return a timespan where no waypoints have a time defined', function() {
    var result = Utils.getTimeSpanForWaypoints([testWaypoints[2]]);
    expect(result.startTime).not.toBeDefined();
    expect(result.endTime).not.toBeDefined();
  });

  it('should calculate the bounds of a number of waypoints', function() {
    var result = Utils.getWaypointBounds(testWaypoints);
    expect(result).toEqual([ '57.0407298383609', '-5.95458984375', '57.7276192162149', '-7.00927734375' ]);
  });

  it('should calculate the bounds of a single waypoint', function() {
    var result = Utils.getWaypointBounds([testWaypoints[0]]);
    expect(result).toEqual([ '57.7276192162149', '-6.39404296875', '57.7276192162149', '-6.39404296875' ]);
  });

  it('should calculate the range for a set of bounds', function() {
    var result = Utils.getRange(testBounds[0]);
    expect(result).toBeCloseTo(167, 0);
  });

  it('should calculate the bounds of a number of bounds', function() {
    var result = Utils.getBounds(testBounds);
    expect(result).toEqual([ 55.5534954584537, -7.00927734375, 58.6083336607763, -5.03173828125 ]);
  });

  it('should return null for bounds if bounds are empty', function() {
    var result = Utils.getBounds([null, null, null, null]);
    expect(result).toBeNull();
  });

  it('should calculate the center of a bounds object', function() {
    var result = Utils.getCenter(testBounds[0]);
    expect(result).toEqual([ 57.9555616585632, -5.4052734375 ]);
  });

  it('should return null for center if bounds are empty', function() {
    var result = Utils.getCenter([null, null, null, null]);
    expect(result).toBeNull();
  });

 describe('ISO Date Convertion', function() {

    it('should convert a valid ISO 8601 date', function () {
      var result = Utils.isoDate('2017-11-27T12:41:06.643Z');
      expect(result).toEqual(new Date(2017, 10, 27, 12, 41, 6, 643));
    });

    it('should convert a variant of a valid ISO 8601 date', function () {
      var result = Utils.isoDate('2017-11-26T13:01:48123:00');
      expect(result).toEqual(new Date(2017, 10, 26, 13, 1, 48, 123));
    });

    it('should convert a variant of a valid ISO 8601 date without a time zone', function () {
      var result = Utils.isoDate('2017-11-26T13:01:48123');
      expect(result).toEqual(new Date(2017, 10, 26, 13, 1, 48, 123));
    });

    it('should convert a variant of a valid ISO 8601 date without milliseconds', function () {
      var result = Utils.isoDate('2017-11-26T13:01:48:00');
      expect(result).toEqual(new Date(2017, 10, 26, 13, 1, 48, 0));
    });

    it('should convert a variant of a valid ISO 8601 date without timezone or milliseconds', function () {
      var result = Utils.isoDate('2017-11-26T13:01:48');
      expect(result).toEqual(new Date(2017, 10, 26, 13, 1, 48, 0));
    });

    it('should convert a nearly valid ISO 8601 date with a positive time zone', function () {
      var result = Utils.isoDate('2017-11-26T13:01:48123:01');
      expect(result).toEqual(new Date(2017, 10, 26, 12, 1, 48, 123));
    });

    it('should handle a null string', function () {
      var result = Utils.isoDate(null);
      expect(result).toBeNull();
    });

    it('should handle an empty string', function () {
      var result = Utils.isoDate("");
      expect(result).toBeNull();
    });

  });

  describe('JSON', function() {

    describe('parse', function() {

      it('should handle bad JSON', function() {
        expect(Utils.parseJSON('rubbish')).toEqual(undefined);
      });

      it('should handle bad JSON', function() {
        expect(Utils.parseJSON('{"a":"fred","b":"jane","c":{"d":"ok"},"list":["1","2"}')).toEqual(undefined);
      });

      it('should handle goood JSON', function() {
        var test = {a: 'fred', b: 'jane', c: {d: 'ok'}, list: ['1', '2', '3']};
        expect(Utils.parseJSON(JSON.stringify(test))).toEqual(test);
      });

    });

    describe('is JSON', function() {

      it('should handle bad JSON', function() {
        expect(Utils.isJSON('rubbish')).toEqual(false);
      });

      it('should handle undefined', function() {
        expect(Utils.isJSON(undefined)).toEqual(false);
      });

      it('should handle NaN', function() {
        expect(Utils.isJSON(NaN)).toEqual(false);
      });

      it('should handle null', function() {
        expect(Utils.isJSON(null)).toEqual(false);
      });

      it('should handle an empty string', function() {
        expect(Utils.isJSON('')).toEqual(false);
      });

      it('should handle an number', function() {
        expect(Utils.isJSON(42)).toEqual(false);
      });

      it('should handle bad JSON', function() {
        expect(Utils.isJSON('{"a":"fred","b":"jane","c":{"d":"ok"},"list":["1","2"}')).toEqual(false);
      });

      it('should handle goood JSON', function() {
        var test = {a: 'fred', b: 'jane', c: {d: 'ok'}, list: ['1', '2', '3']};
        expect(Utils.isJSON(JSON.stringify(test))).toEqual(true);
      });

    });

  });

  describe('ISO8601 validation', function() {

    it('should reject null', function() {
      expect(Utils.isISO8601(null)).toEqual(false);
    });

    it('should reject undefined', function() {
      expect(Utils.isISO8601(undefined)).toEqual(false);
    });

    it('should accept a valid date', function() {
      var dt = new Date(2018, 0, 24, 17, 30, 32, 0);
      expect(Utils.isISO8601(dt.toISOString())).toEqual(true);
    });

  });

  describe('Email validation', function() {

    it('should accept a valid email address', function() {
      expect(Utils.isEmail('test@example.com')).toEqual(true);
    });

    it('should accept a valid email address with subdomain', function() {
      expect(Utils.isEmail('big.test@sub-domain.example.com')).toEqual(true);
    });

    it('should reject an invalid email address with more than one @ symbol', function() {
      expect(Utils.isEmail('big.test@sub-domain@example.com')).toEqual(false);
    });

    it('should reject an invalid email address', function() {
      expect(Utils.isEmail('@example.com')).toEqual(false);
    });

    it('should reject an invalid email address', function() {
      expect(Utils.isEmail('test@test')).toEqual(false);
    });

    it('should reject an empty email address', function() {
      expect(Utils.isEmail('')).toEqual(false);
    });

    it('should reject a null email address', function() {
      expect(Utils.isEmail(null)).toEqual(false);
    });

    it('should reject an undefined email address', function() {
      expect(Utils.isEmail(undefined)).toEqual(false);
    });

  });

  describe ('Scarfs equivalence', function() {
    var result;

    it('should calculate based on distance and ascent', function() {
      result = Utils.scarfsEquivalence(6.32, 238, 4);
      expect(result).toEqual({hours: 2, minutes: 3});
    });

    it('should calculate with larger values distance and ascent', function() {
      result = Utils.scarfsEquivalence(733146.32, 34835238.378, 4);
      expect(result).toEqual({hours: 252260, minutes: 21});
    });

    it('should calculate with large values for distance, ascent and speed', function() {
      // Average distances to Alpha Centauri and the Sun, at the speed of light
      result = Utils.scarfsEquivalence(40149186000000, 149468000, 299792.458 * 3600);
      expect(result).toEqual({hours: 37200, minutes: 55});
    });

    it('should return zero if distance and ascent are 0', function() {
      result = Utils.scarfsEquivalence(0, 0, 4);
      expect(result).toEqual({hours: 0, minutes: 0});
    });

    it('should return zero if distance is null', function() {
      result = Utils.scarfsEquivalence(null, 4, 4);
      expect(result).toEqual({hours: 0, minutes: 0});
    });

    it('should calculate if distance is undefined', function() {
      result = Utils.scarfsEquivalence(undefined, 1159, 4);
      expect(result).toEqual({hours: 2, minutes: 18});
    });

    it('should return undefined if distance and ascent are undefined', function() {
      result = Utils.scarfsEquivalence(undefined, undefined, 4);
      expect(result).toEqual({hours: undefined, minutes: undefined});
    });

    it('should return infinity if all parameters are undefined', function() {
      result = Utils.scarfsEquivalence();
      expect(result).toEqual({hours: Infinity, minutes: Infinity});
    });

    it('should return infinity if speed is zero', function() {
      result = Utils.scarfsEquivalence(2, 3, 0);
      expect(result).toEqual({hours: Infinity, minutes: Infinity});
    });

    it('should return infinity if speed is null', function() {
      result = Utils.scarfsEquivalence(2, 3, null);
      expect(result).toEqual({hours: Infinity, minutes: Infinity});
    });

    it('should return zero if speed is infinite', function() {
      result = Utils.scarfsEquivalence(2, 3, Infinity);
      expect(result).toEqual({hours: 0, minutes: 0});
    });

    it('should return infinity if distance is infinite', function() {
      result = Utils.scarfsEquivalence(Infinity, 3, 5);
      expect(result).toEqual({hours: Infinity, minutes: Infinity});
    });

    it('should return infinity if ascent is infinite', function() {
      result = Utils.scarfsEquivalence(15, Infinity, 5);
      expect(result).toEqual({hours: Infinity, minutes: Infinity});
    });

    it('should return infinity if distance and ascent are infinite', function() {
      result = Utils.scarfsEquivalence(Infinity, Infinity, 5);
      expect(result).toEqual({hours: Infinity, minutes: Infinity});
    });

    it('should return infinity if speed is undefined', function() {
      result = Utils.scarfsEquivalence(2, 3, undefined);
      expect(result).toEqual({hours: Infinity, minutes: Infinity});
    });

    it('should calculate if ascent is 0', function() {
      result = Utils.scarfsEquivalence(6.32, 0, 4);
      expect(result).toEqual({hours: 1, minutes: 35});
    });

    it('should calculate if ascent is undefined', function() {
      result = Utils.scarfsEquivalence(6.32, undefined, 4);
      expect(result).toEqual({hours: 1, minutes: 35});
    });

    it('should calculate if ascent is null', function() {
      result = Utils.scarfsEquivalence(6.32, null, 4);
      expect(result).toEqual({hours: 1, minutes: 35});
    });

  });

});
