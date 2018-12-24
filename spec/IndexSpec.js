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

describe('login.js', function() {
  var IndexModule = require('../index.js');
  var result;

  describe('Valid cookie', function() {

    beforeEach(function() {
      result = IndexModule.parseCookies('access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1a19jb19mZHNkX3RyaXBfYWRtaW4iOmZhbHNlLCJ1a19jb19mZHNkX3RyaXBfcmVuZXdXaXRoaW4iOjM2MDAsImlhdCI6MTU0MTI2NjcwMiwiZXhwIjoxNTQxMjczOTAyLCJzdWIiOiJ1c2VyQHRyaXAudGVzdCIsImp0aSI6IjhhNmE2NTEzLTQzZjUtNDQ1NC05ODAzLTA4YjBiYzI5NDBmZCJ9.7S7GpebUri04_3UfDX0HjyDHtR73V2IKjNVgPlSyMsE; TRIP-XSRF-TOKEN=8a6a6513-43f5-4454-9803-08b0bc2940fd');
    });

    it('should return an array containing the individual cookies', function() {
      expect(result.access_token).toBeDefined();
      expect(result["TRIP-XSRF-TOKEN"]).toBeDefined();
      expect(result.access_token).toEqual('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1a19jb19mZHNkX3RyaXBfYWRtaW4iOmZhbHNlLCJ1a19jb19mZHNkX3RyaXBfcmVuZXdXaXRoaW4iOjM2MDAsImlhdCI6MTU0MTI2NjcwMiwiZXhwIjoxNTQxMjczOTAyLCJzdWIiOiJ1c2VyQHRyaXAudGVzdCIsImp0aSI6IjhhNmE2NTEzLTQzZjUtNDQ1NC05ODAzLTA4YjBiYzI5NDBmZCJ9.7S7GpebUri04_3UfDX0HjyDHtR73V2IKjNVgPlSyMsE');
      expect(result["TRIP-XSRF-TOKEN"]).toEqual('8a6a6513-43f5-4454-9803-08b0bc2940fd');
    });

  });

  describe('Invalid cookie', function() {

    beforeEach(function() {
      result = IndexModule.parseCookies('abcdefg');
    });

    it('should handle a single invalid cookie', function() {
      expect(result.abcdefg).toBeDefined();
      expect(result.abcdefg).toEqual('');
    });

  });

  describe('Invalid multiple cookies', function() {

    beforeEach(function() {
      result = IndexModule.parseCookies('first;second');
    });

    it('should handle multiple cookie with pairs', function() {
      expect(result.first).toBeDefined();
      expect(result.first).toEqual('');
      expect(result.second).toBeDefined();
      expect(result.second).toEqual('');
    });

  });

  describe('undefined cookie', function() {

    beforeEach(function() {
      result = IndexModule.parseCookies(undefined);
    });

    it('should handle an undefined cookie', function() {
      expect(result).toEqual({});
    });

  });

  describe('empty cookie', function() {

    beforeEach(function() {
      result = IndexModule.parseCookies('');
    });

    it('should handle an empty cookie', function() {
      expect(result).toEqual({});
    });

  });

  describe('null cookie', function() {

    beforeEach(function() {
      result = IndexModule.parseCookies(null);
    });

    it('should handle a single cookie without pairs', function() {
      expect(result).toEqual({});
    });

  });

});
