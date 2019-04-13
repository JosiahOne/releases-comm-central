/* -*- Mode: Javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from ../../../../toolkit/content/preferencesBindings.js */

var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

Preferences.addAll([
  { id: "network.proxy.type", type: "int" },
  { id: "network.proxy.http", type: "string" },
  { id: "network.proxy.http_port", type: "int" },
  { id: "network.proxy.ssl", type: "string" },
  { id: "network.proxy.ssl_port", type: "int" },
  { id: "network.proxy.socks", type: "string" },
  { id: "network.proxy.socks_port", type: "int" },
  { id: "network.proxy.socks_version", type: "int" },
  { id: "network.proxy.no_proxies_on", type: "string" },
  { id: "network.proxy.autoconfig_url", type: "string" },
  { id: "network.proxy.share_proxy_settings", type: "bool" },
  { id: "pref.advanced.proxies.disable_button.reload", type: "bool" },
  { id: "network.proxy.backup.ssl", type: "string" },
  { id: "network.proxy.backup.ssl_port", type: "int" },
  { id: "network.proxy.backup.socks", type: "string" },
  { id: "network.proxy.backup.socks_port", type: "int" },
  { id: "network.proxy.socks_remote_dns", type: "bool" },
  { id: "network.trr.mode", type: "int" },
  { id: "network.trr.uri", type: "string" },
  { id: "network.trr.custom_uri", type: "string" },
  { id: "signon.autologin.proxy", type: "bool" },
]);

var gConnectionsDialog = {
  beforeAccept() {
    if (document.getElementById("customDnsOverHttpsUrlRadio").selected) {
      Services.prefs.setStringPref("network.trr.uri", document.getElementById("customDnsOverHttpsInput").value);
    }

    var proxyTypePref = Preferences.get("network.proxy.type");
    if (proxyTypePref.value == 2) {
      this.doAutoconfigURLFixup();
      return true;
    }

    if (proxyTypePref.value != 1)
      return true;

    var httpProxyURLPref = Preferences.get("network.proxy.http");
    var httpProxyPortPref = Preferences.get("network.proxy.http_port");
    var shareProxiesPref = Preferences.get("network.proxy.share_proxy_settings");
    if (shareProxiesPref.value) {
      var proxyPrefs = ["ssl", "socks"];
      for (var i = 0; i < proxyPrefs.length; ++i) {
        var proxyServerURLPref = Preferences.get("network.proxy." + proxyPrefs[i]);
        var proxyPortPref = Preferences.get("network.proxy." + proxyPrefs[i] + "_port");
        var backupServerURLPref = Preferences.get("network.proxy.backup." + proxyPrefs[i]);
        var backupPortPref = Preferences.get("network.proxy.backup." + proxyPrefs[i] + "_port");
        backupServerURLPref.value = proxyServerURLPref.value;
        backupPortPref.value = proxyPortPref.value;
        proxyServerURLPref.value = httpProxyURLPref.value;
        proxyPortPref.value = httpProxyPortPref.value;
      }
    }

    var noProxiesPref = Preferences.get("network.proxy.no_proxies_on");
    noProxiesPref.value = noProxiesPref.value.replace(/[;]/g, ",");

    return true;
  },

  checkForSystemProxy() {
    if ("@mozilla.org/system-proxy-settings;1" in Cc)
      document.getElementById("systemPref").removeAttribute("hidden");
  },

  proxyTypeChanged() {
    var proxyTypePref = Preferences.get("network.proxy.type");

    // Update http
    var httpProxyURLPref = Preferences.get("network.proxy.http");
    httpProxyURLPref.disabled = proxyTypePref.value != 1;
    var httpProxyPortPref = Preferences.get("network.proxy.http_port");
    httpProxyPortPref.disabled = proxyTypePref.value != 1;

    // Now update the other protocols
    gConnectionsDialog.updateProtocolPrefs();

    var shareProxiesPref = Preferences.get("network.proxy.share_proxy_settings");
    shareProxiesPref.disabled = proxyTypePref.value != 1;

    var autologinProxyPref = Preferences.get("signon.autologin.proxy");
    autologinProxyPref.disabled = proxyTypePref.value == 0;

    var noProxiesPref = Preferences.get("network.proxy.no_proxies_on");
    noProxiesPref.disabled = proxyTypePref.value == 0;

    var autoconfigURLPref = Preferences.get("network.proxy.autoconfig_url");
    autoconfigURLPref.disabled = proxyTypePref.value != 2;

    gConnectionsDialog.updateReloadButton();
  },

  updateDNSPref() {
    var socksVersionPref = Preferences.get("network.proxy.socks_version");
    var socksDNSPref = Preferences.get("network.proxy.socks_remote_dns");
    var proxyTypePref = Preferences.get("network.proxy.type");
    var isDefinitelySocks4 = !socksVersionPref.disabled && socksVersionPref.value == 4;
    socksDNSPref.disabled = (isDefinitelySocks4 || proxyTypePref.value == 0);
    return undefined;
  },

  updateReloadButton() {
    // Disable the "Reload PAC" button if the selected proxy type is not PAC or
    // if the current value of the PAC textbox does not match the value stored
    // in prefs.  Likewise, disable the reload button if PAC is not configured
    // in prefs.

    var typedURL = document.getElementById("networkProxyAutoconfigURL").value;
    var proxyTypeCur = Preferences.get("network.proxy.type").value;

    var pacURL = Services.prefs.getCharPref("network.proxy.autoconfig_url");
    var proxyType = Services.prefs.getIntPref("network.proxy.type");

    var disableReloadPref =
        Preferences.get("pref.advanced.proxies.disable_button.reload");
    disableReloadPref.disabled =
        (proxyTypeCur != 2 || proxyType != 2 || typedURL != pacURL);
  },

  readProxyType() {
    this.proxyTypeChanged();
    return undefined;
  },

  updateProtocolPrefs() {
    var proxyTypePref = Preferences.get("network.proxy.type");
    var shareProxiesPref = Preferences.get("network.proxy.share_proxy_settings");
    var proxyPrefs = ["ssl", "socks"];
    for (var i = 0; i < proxyPrefs.length; ++i) {
      var proxyServerURLPref = Preferences.get("network.proxy." + proxyPrefs[i]);
      var proxyPortPref = Preferences.get("network.proxy." + proxyPrefs[i] + "_port");

      // Restore previous per-proxy custom settings, if present.
      if (!shareProxiesPref.value) {
        var backupServerURLPref = Preferences.get("network.proxy.backup." + proxyPrefs[i]);
        var backupPortPref = Preferences.get("network.proxy.backup." + proxyPrefs[i] + "_port");
        if (backupServerURLPref.hasUserValue) {
          proxyServerURLPref.value = backupServerURLPref.value;
          backupServerURLPref.reset();
        }
        if (backupPortPref.hasUserValue) {
          proxyPortPref.value = backupPortPref.value;
          backupPortPref.reset();
        }
      }

      proxyServerURLPref.updateElements();
      proxyPortPref.updateElements();
      proxyServerURLPref.disabled = proxyTypePref.value != 1 || shareProxiesPref.value;
      proxyPortPref.disabled = proxyServerURLPref.disabled;
    }
    var socksVersionPref = Preferences.get("network.proxy.socks_version");
    socksVersionPref.disabled = proxyTypePref.value != 1 || shareProxiesPref.value;
    this.updateDNSPref();
    return undefined;
  },

  readProxyProtocolPref(aProtocol, aIsPort) {
    var shareProxiesPref = Preferences.get("network.proxy.share_proxy_settings");
    if (shareProxiesPref.value) {
      var pref = Preferences.get("network.proxy.http" + (aIsPort ? "_port" : ""));
      return pref.value;
    }

    var backupPref = Preferences.get("network.proxy.backup." + aProtocol + (aIsPort ? "_port" : ""));
    return backupPref.hasUserValue ? backupPref.value : undefined;
  },

  reloadPAC() {
    Cc["@mozilla.org/network/protocol-proxy-service;1"].
        getService().reloadPAC();
  },

  doAutoconfigURLFixup() {
    var autoURL = document.getElementById("networkProxyAutoconfigURL");
    var autoURLPref = Preferences.get("network.proxy.autoconfig_url");
    try {
      autoURLPref.value = autoURL.value = Services.uriFixup.createFixupURI(autoURL.value, 0).spec;
    } catch (ex) {}
  },

  readHTTPProxyServer() {
    var shareProxiesPref = Preferences.get("network.proxy.share_proxy_settings");
    if (shareProxiesPref.value)
      this.updateProtocolPrefs();
    return undefined;
  },

  readHTTPProxyPort() {
    var shareProxiesPref = Preferences.get("network.proxy.share_proxy_settings");
    if (shareProxiesPref.value)
      this.updateProtocolPrefs();
    return undefined;
  },

  isDnsOverHttpsEnabled() {
    // values outside 1:4 are considered falsey/disabled in this context
    let trrPref = Preferences.get("network.trr.mode");
    let enabled = trrPref.value > 0 && trrPref.value < 5;
    return enabled;
  },

  readDnsOverHttpsMode() {
    // called to update checked element property to reflect current pref value
    let enabled = this.isDnsOverHttpsEnabled();
    let uriPref = Preferences.get("network.trr.uri");
    uriPref.disabled = !enabled;
    return enabled;
  },

  writeDnsOverHttpsMode() {
    // called to update pref with user change
    let trrModeCheckbox = document.getElementById("networkDnsOverHttps");
    // we treat checked/enabled as mode 2
    return trrModeCheckbox.checked ? 2 : 0;
  },

  updateDnsOverHttpsUI() {
    // Disable the custom url input box if the parent checkbox and custom radio
    // button attached to it is not selected.
    // Disable the custom radio button if the parent checkbox is not selected.
    let parentCheckbox = document.getElementById("networkDnsOverHttps");
    let customDnsOverHttpsUrlRadio = document.getElementById("customDnsOverHttpsUrlRadio");
    let customDnsOverHttpsInput = document.getElementById("customDnsOverHttpsInput");
    customDnsOverHttpsInput.disabled = !parentCheckbox.checked || !customDnsOverHttpsUrlRadio.selected;
    customDnsOverHttpsUrlRadio.disabled = !parentCheckbox.checked;
  },

  initDnsOverHttpsUI() {
    let defaultDnsOverHttpsUrlRadio = document.getElementById("defaultDnsOverHttpsUrlRadio");
    let defaultPrefUrl = Preferences.get("network.trr.uri").defaultValue;
    document.getElementById("defaultDnsOverHttpsUrlLabel").setAttribute("value", "(" + defaultPrefUrl + ")");
    defaultDnsOverHttpsUrlRadio.value = defaultPrefUrl;
    let radioGroup = document.getElementById("DnsOverHttpsUrlRadioGroup");
    radioGroup.selectedIndex = Preferences.get("network.trr.uri").hasUserValue ? 1 : 0;
    this.updateDnsOverHttpsUI();
  },
};

Preferences.get("network.proxy.type").on("change", gConnectionsDialog.proxyTypeChanged);
