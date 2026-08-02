---
title: "Deleting a File Does Not Clear RAG Memory"
pubDate: 2026-06-06
description: "Deleting source documents does not guarantee that their vector representations are gone: an agent's memory must be cleared at every storage layer."
tags: ["agents", "rag", "memory", "reliability"]
lang: en
source: "field-note"
draft: false
---

## Symptom

The agent continued to use information from test onboarding documents even
though the documents had been deleted and the user-visible memory appeared empty.

During the conversation, the agent confidently referred to a deleted document but
could not provide it as a file or explain where else it had obtained the
information.

## Context

I loaded several test documents into the system and asked the agent to forget
them. The files were deleted, and the records visible in the ordinary memory
interface disappeared.

The agent still answered as if the original documents were part of its context.

## Root cause

The delete operation did not cover every memory layer. The source documents
disappeared from the file or application store, but their chunks remained in the
RAG vector index. The agent retrieved those records during search and used them as
context, turning deleted documents into phantom memory.

## Broken assumption

I assumed that deleting a document from the primary store would automatically
remove all derived data. That assumption seemed reasonable because the memory
looked empty in the user interface. In reality, the interface exposed only one
state layer and did not show the contents of the vector index.

## Detection

I found the problem during a manual check: after deleting the documents, I asked
the agent a question that could be answered only from those documents. The agent
reproduced the deleted information even though the file could no longer be opened
or found through the ordinary memory operations.

This scenario should be a dedicated deletion check, not just a check that the
source file has disappeared.

## Fix

Deletion was implemented as a coordinated operation across every memory layer used
by the agent:

- the source document;
- the application record for the document and its chunks;
- the vector representations in the RAG index;
- related caches and metadata, if they participate in retrieval.

Deletion is complete only after confirming that no layer used to build context can
return the deleted content.

## Test

The minimum regression scenario should load a test document with unique content,
verify that the agent can retrieve it, delete the document, and repeat the same
query. After deletion, neither search nor the agent's response should return the
document's content, directly or through its chunks.

The original note does not record an automated test for this scenario. That is a
separate gap to close together with the implementation of complete CRUD for agent
memory.

## General lesson

Agent memory is not a single store. It is a chain of source data and derived
indexes. Deletion needs an explicit contract for every layer and a verifiable
postcondition: deleted knowledge no longer participates in retrieval or enters
the agent's context.
