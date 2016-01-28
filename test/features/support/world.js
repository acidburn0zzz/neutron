"use strict";

const Webdriver = require("webdriverio"),
    request = require("request-promise"),
    expect = require("expect"),
    path = require("path"),
    fs = require("fs"),
    q = require("q"),
    validate = require('jsonschema').validate;

class World {
    constructor() {
        this.scheme = process.env.NEUTRON_SCHEME || "http";
        this.host = process.env.NEUTRON_HOST || "localhost";
        this.port = process.env.NEUTRON_PORT || 8080;
        this.directory = process.env.NEUTRON_STORAGE_LOCAL_DIRECTORY || path.join(__dirname, "..", "..", "..", "updates");

        this.reset();
    }

    reset() {
        Object.keys(this.releases || {}).forEach(name => this.deleteApp(name));

        this.releases = {};
    }

    deleteApp(app) {
        this.deleteReleases(app);

        fs.rmdirSync(path.join(this.directory, app));

        delete this.releases[app];
    }

    deleteReleases(app) {
        this.releases[app].forEach(name => this.deleteRelease(app, name));
    }

    deleteRelease(app, name) {
        fs.unlinkSync(path.join(this.directory, app, name, "update.zip"));
        fs.rmdirSync(path.join(this.directory, app, name));

        this.releases[app] = this.releases[app].filter(release => release !== name);
    }

    get browser() {
        if (!this._browser) {
            this._browser = Webdriver.remote({
                logLevel: "silent",
                host: "localhost",
                port: 5050,
                waitforTimeout: 2000,
                desiredCapabilities: { browserName: "firefox" }
            });
        }

        return this._browser;
    }

    get assert() {
        return {
            equals: (actual, expected) => expect(actual).toEqual(expected),
            notEquals: (actual, expected) => expect(actual).toNotEqual(expected),
            includes: (actual, expected) => expect(actual).toInclude(expected),
            json: (actual, expected) => validate(actual, expected, { throwError: true })
        }
    }

    get schemas() {
        return {
            empty: require("./schemas/empty-list"),
            app: require("./schemas/app"),
            apps: require("./schemas/apps"),
            release: require("./schemas/release"),
            releases: require("./schemas/releases")
        }
    }

    get response() {
        this.assert.notEquals(this._response, undefined);

        this._response.json = () => JSON.parse(this._response.body);

        return this._response;
    }

    get error() {
        return this._error;
    }

    visit(url) {
        return this.browser.url(`${this.scheme}://${this.host}:${this.port}${url}`);
    }

    get(url) {
        this._response = undefined;
        this._error = undefined;

        const options = {
            method: "GET",
            uri: `${this.scheme}://${this.host}:${this.port}${url}`,
            resolveWithFullResponse: true
        };

        return request(options)
            .then(response => this._response = response)
            .catch(error => this._error = error);
    }

    createApp(name) {
        fs.mkdirSync(path.join(this.directory, name));

        this.releases[name] = [];
    }

    createRelease(app, name) {
        fs.mkdirSync(path.join(this.directory, app, name));
        fs.writeFileSync(path.join(this.directory, app, name, "update.zip"), "");

        this.releases[app].push(name);
    }
}

module.exports = function() {
    this.World = World;
};
