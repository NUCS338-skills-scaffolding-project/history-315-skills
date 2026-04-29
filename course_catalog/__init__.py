"""Catalog: a browsable knowledge graph of HIST 315.

See docs/ ../i-want-you-to-resilient-lighthouse.md (in plan dir) for the design.

Public surface:
    from course_catalog import db, builder
    from course_catalog.builder import Builder

Storage:
    catalog.db                — SQLite with FTS5 (created at app startup)
    catalog/build/            — runtime work directory for the build pipeline
"""

from . import db, builder

__all__ = ["db", "builder"]
