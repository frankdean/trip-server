/**
 * @license TRIP - Trip Recording and Itinerary Planning application.
 * (c) 2016-2020 Frank Dean <frank@fdsd.co.uk>
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

describe('TripLogger settings upload', function() {
  var err,
      db = require('../db.js'),
      testModule = require('../tracks.js');

  beforeEach(function(done) {
    spyOn(db, 'updateTripLoggerSettingsByUsername').and.callThrough();
    testModule.importSettingsFile('user@trip.test', './spec/triplogger-settings.yaml', false, function(_err_) {
      err = _err_;
      done();
    });
  });

  it('should import a valid triplogger settings file', function() {
    expect(err).toBeFalsy();
    expect(db.updateTripLoggerSettingsByUsername).toHaveBeenCalledTimes(1);
  });

});
