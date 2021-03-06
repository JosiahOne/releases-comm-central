/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * Tests for accountcreation/guessConfig.js
 *
 * Currently tested:
 * - getHostEntry function.
 * - getIncomingTryOrder function.
 * - getOutgoingTryOrder function.
 *
 * TODO:
 * - Test the returned CMDS.
 * - Figure out what else to test.
 */

// Globals

var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

/* import-globals-from ../../accountcreation/content/util.js */
/* import-globals-from ../../accountcreation/content/accountConfig.js */
/* import-globals-from ../../accountcreation/content/sanitizeDatatypes.js */
/* import-globals-from ../../accountcreation/content/fetchhttp.js */
/* import-globals-from ../../accountcreation/content/guessConfig.js */

Services.scriptloader.loadSubScript("chrome://messenger/content/accountcreation/util.js");
Services.scriptloader.loadSubScript("chrome://messenger/content/accountcreation/accountConfig.js");
Services.scriptloader.loadSubScript("chrome://messenger/content/accountcreation/sanitizeDatatypes.js");
Services.scriptloader.loadSubScript("chrome://messenger/content/accountcreation/fetchhttp.js");
Services.scriptloader.loadSubScript("chrome://messenger/content/accountcreation/guessConfig.js");

/*
 * UTILITIES
 */

function assert(aBeTrue, aWhy) {
  if (!aBeTrue)
    do_throw(aWhy);
  Assert.ok(aBeTrue);
}

function assert_equal(aA, aB, aWhy) {
  if (aA != aB)
    do_throw(aWhy);
  Assert.equal(aA, aB);
}

/**
 * Test that two host entries are the same, ignoring the commands.
 */
function assert_equal_host_entries(hostEntry, expected) {
  assert_equal(hostEntry.protocol, expected[0], "Protocols are different");
  assert_equal(hostEntry.ssl, expected[1], "SSL values are different");
  assert_equal(hostEntry.port, expected[2], "Port values are different");
}

/**
 * Assert that the list of tryOrders are the same.
 */
function assert_equal_try_orders(aA, aB) {
  assert_equal(aA.length, aB.length, "tryOrders have different length");
  for (let [i, subA] of aA.entries()) {
    let subB = aB[i];
    assert_equal_host_entries(subA, subB);
  }
}

/**
 * Check that the POP calculations are correct for a given host and
 * protocol.
 */
function checkPop(host, protocol) {
  // The list of protocol+ssl+port configurations should match
  // getIncomingTryOrder() in guessConfig.js.
  // SSL configs are separated until bug 1520283 is fixed.

  // port == UNKNOWN
    // [POP, TLS, 110], [POP, SSL, 995], [POP, NONE, 110]
  // port != UNKNOWN
    // ssl == UNKNOWN
      // [POP, TLS, port], [POP, SSL, port], [POP, NONE, port]
    // ssl != UNKNOWN
      // [POP, ssl, port]
  let ssl = UNKNOWN;
  let port = UNKNOWN;
  let tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[POP, TLS, 110],
                        // [POP, SSL, 995],
                           [POP, NONE, 110]]);

  ssl = TLS;
  tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[POP, ssl, 110]]);

  ssl = SSL;
  tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[POP, ssl, 995]]);

  ssl = NONE;
  tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[POP, ssl, 110]]);

  ssl = UNKNOWN;
  port = 31337;
  tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[POP, TLS, port],
                        // [POP, SSL, port],
                           [POP, NONE, port]]);

  for (ssl in [TLS, SSL, NONE]) {
    tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
    assert_equal_try_orders(tryOrder,
                            [[POP, ssl, port]]);
  }
}

/**
 * Check that the IMAP calculations are correct for a given host and
 * protocol.
 */
function checkImap(host, protocol) {
  // The list of protocol+ssl+port configurations should match
  // getIncomingTryOrder() in guessConfig.js.
  // SSL configs are separated until bug 1520283 is fixed.

  // port == UNKNOWN
    // [IMAP, TLS, 143], [IMAP, SSL, 993], [IMAP, NONE, 143]
  // port != UNKNOWN
    // ssl == UNKNOWN
      // [IMAP, TLS, port], [IMAP, SSL, port], [IMAP, NONE, port]
    // ssl != UNKNOWN
     // [IMAP, ssl, port];

  let ssl = UNKNOWN;
  let port = UNKNOWN;
  let tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[IMAP, TLS, 143],
                        // [IMAP, SSL, 993],
                           [IMAP, NONE, 143]]);

  ssl = TLS;
  tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[IMAP, ssl, 143]]);

  ssl = SSL;
  tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[IMAP, ssl, 993]]);

  ssl = NONE;
  tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[IMAP, ssl, 143]]);

  ssl = UNKNOWN;
  port = 31337;
  tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[IMAP, TLS, port],
                        // [IMAP, SSL, port],
                           [IMAP, NONE, port]]);

  for (ssl in [TLS, SSL, NONE]) {
    tryOrder = getIncomingTryOrder(host, protocol, ssl, port);
    assert_equal_try_orders(tryOrder,
                            [[IMAP, ssl, port]]);
  }
}

/*
 * TESTS
 */

/**
 * Test that getHostEntry returns the correct port numbers.
 *
 * TODO:
 * - Test the returned commands as well.
 */
function test_getHostEntry() {
  // IMAP port numbers.
  assert_equal_host_entries(getHostEntry(IMAP, TLS, UNKNOWN),
                            [IMAP, TLS, 143]);
  assert_equal_host_entries(getHostEntry(IMAP, SSL, UNKNOWN),
                            [IMAP, SSL, 993]);
  assert_equal_host_entries(getHostEntry(IMAP, NONE, UNKNOWN),
                            [IMAP, NONE, 143]);

  // POP port numbers.
  assert_equal_host_entries(getHostEntry(POP, TLS, UNKNOWN),
                            [POP, TLS, 110]);
  assert_equal_host_entries(getHostEntry(POP, SSL, UNKNOWN),
                            [POP, SSL, 995]);
  assert_equal_host_entries(getHostEntry(POP, NONE, UNKNOWN),
                            [POP, NONE, 110]);

  // SMTP port numbers.
  assert_equal_host_entries(getHostEntry(SMTP, TLS, UNKNOWN),
                            [SMTP, TLS, 587]);
  assert_equal_host_entries(getHostEntry(SMTP, SSL, UNKNOWN),
                            [SMTP, SSL, 465]);
  assert_equal_host_entries(getHostEntry(SMTP, NONE, UNKNOWN),
                            [SMTP, NONE, 587]);
}

/**
 * Test the getIncomingTryOrder method.
 */
function test_getIncomingTryOrder() {
  // The list of protocol+ssl+port configurations should match
  // getIncomingTryOrder() in guessConfig.js.
  // SSL configs are separated until bug 1520283 is fixed.

  // protocol == POP || host starts with pop. || host starts with pop3.
  checkPop("example.com", POP);
  checkPop("pop.example.com", UNKNOWN);
  checkPop("pop3.example.com", UNKNOWN);
  checkPop("imap.example.com", POP);

  // protocol == IMAP || host starts with imap.
  checkImap("example.com", IMAP);
  checkImap("imap.example.com", UNKNOWN);
  checkImap("pop.example.com", IMAP);

  let domain = "example.com";
  let protocol = UNKNOWN;
  let ssl = UNKNOWN;
  let port = UNKNOWN;
  let tryOrder = getIncomingTryOrder(domain, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[IMAP, TLS, 143],
                        // [IMAP, SSL, 993],
                           [POP, TLS, 110],
                        // [POP, SSL, 995],
                           [IMAP, NONE, 143],
                           [POP, NONE, 110]]);

  ssl = SSL;
  tryOrder = getIncomingTryOrder(domain, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[IMAP, SSL, 993],
                           [POP, SSL, 995]]);

  ssl = UNKNOWN;
  port = 31337;
  tryOrder = getIncomingTryOrder(domain, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[IMAP, TLS, port],
                        // [IMAP, SSL, port],
                           [POP, TLS, port],
                        // [POP, SSL, port],
                           [IMAP, NONE, port],
                           [POP, NONE, port]]);

  ssl = SSL;
  tryOrder = getIncomingTryOrder(domain, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[IMAP, SSL, port],
                           [POP, SSL, port]]);
}

/**
 * Test the getOutgoingTryOrder method.
 */
function test_getOutgoingTryOrder() {
  // The list of protocol+ssl+port configurations should match
  // getOutgoingTryOrder() in guessConfig.js.
  // SSL configs are separated until bug 1520283 is fixed.
  let domain = "example.com";
  let protocol = SMTP;
  let ssl = UNKNOWN;
  let port = UNKNOWN;
  let tryOrder = getOutgoingTryOrder(domain, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[SMTP, TLS, 587],
                           [SMTP, TLS, 25],
                        // [SMTP, SSL, 465],
                           [SMTP, NONE, 587],
                           [SMTP, NONE, 25]]);

  ssl = SSL;
  tryOrder = getOutgoingTryOrder(domain, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[SMTP, SSL, 465]]);

  ssl = UNKNOWN;
  port = 31337;
  tryOrder = getOutgoingTryOrder(domain, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[SMTP, TLS, port],
                        // [SMTP, SSL, port],
                           [SMTP, NONE, port]]);

  ssl = SSL;
  tryOrder = getOutgoingTryOrder(domain, protocol, ssl, port);
  assert_equal_try_orders(tryOrder,
                          [[SMTP, SSL, port]]);
}


function run_test() {
  test_getHostEntry();
  test_getIncomingTryOrder();
  test_getOutgoingTryOrder();
}
