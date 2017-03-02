/**
 * @license TRIP - Trip Recording and Itinerary Planning application.
 * (c) 2016, 2017 Frank Dean <frank@fdsd.co.uk>
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

var winston = require('winston');

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

  var track1 = [
    {"lng":"58.6083336607763","lat":"-5.03173828125","ele":"389.3"},
    {"lng":"57.3027896563501","lat":"-5.77880859375","ele":"384.4"},
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

  var testBadRoutes = [{"points":[{"lat":"51","lng":"-1","ele":"rubbish"},
                                  {"lat":"52","lng":"-21","ele":"rubbish"}]},
                       {"points":[{"lat":"51","lng":"-1","ele":"rubbish"},
                                  {"lat":"52","lng":"-21","ele":"rubbish"},
                                  {"lat":"53","lng":"-10","ele":"100"},
                                  {"lat":"53.5","lng":"-10.5","ele":"150"}]},
                       {"points":[{"lat":"rubbish","lng":"-9","ele":"rubbish"},
                                  {"lat":"52","lng":"-21","ele":"rubbish"},
                                  {"lat": "53.5","lng":"-10.5","ele":"99"}]}];

  it('should calculate the length of a set or coordinates', function() {
    expect(Utils.unitTests.calculateDistance(testCoords)).toBeCloseTo(2303.30, 2);
  });

  it('should calculate the length of a number of routes', function()  {
    Utils.fillDistanceElevationForRoutes(testRoutes);
    var r = testRoutes[0];
    expect(r.distance).toBeCloseTo(2303.30, 2);
    expect(r.lowest).toBeCloseTo(351.40, 2);
    expect(r.highest).toBeCloseTo(389.3, 2);
    expect(r.ascent).toBeCloseTo(52, 2);
    expect(r.descent).toBeCloseTo(58.6, 2);
  });

  it('should calculate the length of a number of tracks', function()  {
    // winston.debug('Track: %j', testTracks);
    Utils.fillDistanceElevationForTracks(testTracks);
    var t = testTracks[0];
    expect(t.distance).toBeCloseTo(2303.30, 2);
    expect(t.lowest).toBeCloseTo(351.40, 2);
    expect(t.highest).toBeCloseTo(389.3, 2);
    expect(t.ascent).toBeCloseTo(52, 2);
    expect(t.descent).toBeCloseTo(58.6, 2);
  });

  it('should calculate elevation data for a path', function() {
    var r = testRoutes[0];
    Utils.calculateElevationData(r);
    // expect(r.distance).toBeCloseTo(3.71, 2);
    expect(r.lowest).toBeCloseTo(351.40, 2);
    expect(r.highest).toBeCloseTo(389.3, 2);
    expect(r.ascent).toBeCloseTo(52, 2);
    expect(r.descent).toBeCloseTo(58.6, 2);
  });

  it('should calculate elevation data for a path', function() {
    var r = testRoutes[1];
    Utils.calculateElevationData(r);
    expect(r.lowest).toBeCloseTo(9900, 0);
    expect(r.highest).toBeCloseTo(10300, 0);
    expect(r.ascent).toBeCloseTo(400, 0);
    expect(r.descent).toBeCloseTo(500, 0);
  });

  it('should calculate elevation data for a reversed path', function() {
    var r = {};
    r.points = [];
    r.points = testRoutes[0].points.slice();
    r.points.reverse();
    Utils.calculateElevationData(r);
    // expect(r.distance).toBeCloseTo(3.71, 2);
    expect(r.lowest).toBeCloseTo(351.40, 2);
    expect(r.highest).toBeCloseTo(389.3, 2);
    expect(r.ascent).toBeCloseTo(58.6, 2);
    expect(r.descent).toBeCloseTo(52, 2);
  });

  it('should calculate the length of a single bad route', function()  {
    Utils.fillDistanceElevationForPath(testBadRoutes[1]);
    expect(testBadRoutes[1].distance).toBeCloseTo(2202.03, 2);
    expect(testBadRoutes[1].lowest).toBeCloseTo(100, 2);
    expect(testBadRoutes[1].highest).toBeCloseTo(150, 2);
    expect(testBadRoutes[1].ascent).toBeCloseTo(50, 2);
    expect(testBadRoutes[1].descent).toBeCloseTo(0, 2);
  });

  it('should calculate the length of another single bad route', function()  {
    Utils.fillDistanceElevationForPath(testBadRoutes[2]);
    expect(testBadRoutes[2].distance).toEqual(NaN);
    expect(testBadRoutes[2].lowest).toBeCloseTo(99, 2);
    expect(testBadRoutes[2].highest).toBeCloseTo(99, 2);
    expect(testBadRoutes[2].ascent).toBeCloseTo(0, 2);
    expect(testBadRoutes[2].descent).toBeCloseTo(0, 2);
  });

  it('should calculate the length of a number of bad routes', function()  {
    Utils.fillDistanceElevationForRoutes(testBadRoutes);
    expect(testBadRoutes[0].distance).toBeCloseTo(1384.89, 2);

    expect(testBadRoutes[1].distance).toBeCloseTo(2202.03, 2);
    expect(testBadRoutes[1].lowest).toBeCloseTo(100, 2);
    expect(testBadRoutes[1].highest).toBeCloseTo(150, 2);
    expect(testBadRoutes[1].ascent).toBeCloseTo(50, 2);
    expect(testBadRoutes[1].descent).toBeCloseTo(0, 2);

    expect(testBadRoutes[2].distance).toEqual(NaN);
    expect(testBadRoutes[2].lowest).toBeCloseTo(99, 2);
    expect(testBadRoutes[2].highest).toBeCloseTo(99, 2);
    expect(testBadRoutes[2].ascent).toBeCloseTo(0, 2);
    expect(testBadRoutes[2].descent).toBeCloseTo(0, 2);
  });

});
