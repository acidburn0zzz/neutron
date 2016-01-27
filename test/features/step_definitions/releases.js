"use strict";

module.exports = function () {
    this.Given(/^the "([^"]+)" release exists for the "([^"]+)" app$/, function(release, app) {
        return this.createRelease(app, release);
    });

    this.Given(/^there is no release for the "([^"]+)" app/, function(app) {
        return this.deleteReleases(app);
    });

    this.Then(/^I should see the release list$/, function() {
        return this.assert.json(this.response.json(), this.schemas.releases);
    });

    this.Then(/^the release list should contain the "([^"]+)" release/, function(version) {
        return this.assert.includes(this.response.json().map(release => ({ version: release.version })), { version });
    });
};
