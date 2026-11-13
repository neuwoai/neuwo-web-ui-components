---
layout: base.njk
title: Neuwo with Eleventy
---

# Neuwo with Eleventy

A sign-up form built from the library's elements, written in Markdown and drawn into the HTML at build time.

<form class="sign-up">
<neuwo-input label="Name" name="name" autocomplete="name"></neuwo-input>
<neuwo-input label="Email" name="email" type="email" required></neuwo-input>
<neuwo-combobox label="Role" name="role" value="publisher">
<option value="publisher">Publisher</option>
<option value="advertiser">Advertiser</option>
<option value="agency">Agency</option>
<option value="other">Other</option>
</neuwo-combobox>
<neuwo-toggle name="digest">Send me the weekly digest</neuwo-toggle>
<neuwo-checkbox name="updates" required>Send me product updates</neuwo-checkbox>
<neuwo-button type="submit">Sign up</neuwo-button>
<neuwo-notice position="static" hidden>
<span slot="title">Thanks for signing up</span>
<span class="entries"></span>
</neuwo-notice>
</form>
