---
title: "App Store Review Exposed Unfinished Product Requirements"
pubDate: 2026-06-29
description: "The iOS rejection showed that technical readiness is not enough without account deletion, appropriate authentication, safe screenshots, and a clear payment model."
tags: ["ios", "app-store", "product", "compliance"]
lang: en
source: "field-note"
draft: false
---

## Symptom

Apple rejected the iOS application during App Store review.

## Context

This was our first experience publishing an application to the App Store. The
review feedback exposed several unfinished requirements at once:

- there was no appropriate sign-in option for a flow that could not require an
  email address;
- users could not delete their accounts;
- screenshots used third-party AI-service logos;
- the submission did not clearly explain who pays for the product and why.

These were not cosmetic comments. They exposed gaps in privacy, onboarding,
marketing materials, and the product model.

## Root cause

Review preparation was treated primarily as a build and functionality check.
Store requirements for authentication, account deletion, third-party service
presentation, and business-model explanation had not been collected into one
release checklist.

## Broken assumption

We assumed that the application was ready once its main flows worked. App Store
readiness also includes account management, privacy flows, screenshots, copy, and
an explanation of the product's value and payment model.

## Detection

The gaps were found only through the external App Store review. A pre-review
checklist could have caught them by treating account creation, data deletion,
authentication, screenshots, and payment explanation as separate required checks.

## Fix

For resubmission, four classes of work were identified:

- a supported privacy-friendly sign-in flow for the use case;
- account and related-data deletion;
- replacement screenshots and removal of third-party logos or acquisition of the
  necessary rights;
- a clear explanation of the user, payer, and product value.

The original note records the rejection reasons but not a complete report of the
finished remediation.

## Test

The release checklist should exercise the application as an external reviewer:

1. create an account and sign in using the available method;
2. find and complete account deletion;
3. verify that privacy text and screenshots match the product;
4. answer from the submission materials who receives value and who pays for the
   service.

Each item should have evidence in the build or submission metadata, not only a
verbal team agreement.

## General lesson

Publishing a mobile application is a review of the whole product system. App Store
review belongs in the engineering release process together with privacy,
accounts, marketing materials, and product economics.
