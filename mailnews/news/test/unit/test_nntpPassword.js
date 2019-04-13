/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/**
 * Authentication tests for NNTP (based on RFC4643).
 *
 * Note: Logins for newsgroup servers for 1.8 were stored with either the
 * default port or the SSL default port. Nothing else!
 */

/* import-globals-from ../../../test/resources/passwordStorage.js */
load("../../../resources/passwordStorage.js");

// The basic daemon to use for testing nntpd.js implementations
var daemon = setupNNTPDaemon();

add_task(async function() {
  // Prepare files for passwords (generated by a script in bug 1018624).
  await setupForPassword("signons-mailnews1.8.json");

  var server = makeServer(NNTP_RFC4643_extension, daemon);
  server.start();

  try {
    var prefix = "news://localhost:" + server.port + "/";
    var transaction;

    // Test - group subscribe listing
    test = "news:*";
    setupProtocolTest(server.port, prefix + "*");
    server.performTest();
    transaction = server.playTransaction();
    do_check_transaction(transaction, ["MODE READER", "LIST",
                                       "AUTHINFO user testnews",
                                       "AUTHINFO pass newstest", "LIST"]);
  } catch (e) {
    dump("NNTP Protocol test " + test + " failed for type RFC 977:\n");
    try {
      var trans = server.playTransaction();
      if (trans)
        dump("Commands called: " + trans.them + "\n");
    } catch (exp) {}
    do_throw(e);
  }
  server.stop();

  var thread = gThreadManager.currentThread;
  while (thread.hasPendingEvents())
    thread.processNextEvent(true);
});
