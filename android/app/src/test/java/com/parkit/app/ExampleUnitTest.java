package com.parkit.app;

import static org.junit.Assert.*;

import org.junit.Test;

/**
 * Local unit test for the PARKIT Android shell.
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
public class ExampleUnitTest {

    @Test
    public void appId_isCorrect() throws Exception {
        assertEquals("com.parkit.app", BuildConfig.APPLICATION_ID);
    }
}
