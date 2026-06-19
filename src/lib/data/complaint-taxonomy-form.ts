import {
  getComplaintCategoriesForManagement,
} from "@/lib/data/complaint-categories";
import { getComplaintIssuesForManagement } from "@/lib/data/complaint-issues";
import {
  getComplaintChannelsForManagement,
  getComplaintSourcesForManagement,
} from "@/lib/data/complaint-sources";
import type { TaxonomyItem } from "@/lib/complaint-taxonomy";
import type {
  ComplaintCategory,
  ComplaintChannel,
  ComplaintIssue,
  ComplaintSource,
} from "@/types";

export interface CategoryIssueTaxonomy {
  categories: ComplaintCategory[];
  issuesByCategoryId: Record<string, ComplaintIssue[]>;
  issuesByCategoryName: Record<string, TaxonomyItem[]>;
}

export interface SourceChannelTaxonomy {
  sources: ComplaintSource[];
  channelsBySourceId: Record<string, ComplaintChannel[]>;
  channelsBySourceName: Record<string, TaxonomyItem[]>;
}

export async function getCategoryIssueTaxonomy(): Promise<CategoryIssueTaxonomy> {
  const [categories, issues] = await Promise.all([
    getComplaintCategoriesForManagement(),
    getComplaintIssuesForManagement(),
  ]);

  const issuesByCategoryId: Record<string, ComplaintIssue[]> = {};
  const issuesByCategoryName: Record<string, TaxonomyItem[]> = {};
  const categoryIdToName = new Map(categories.map((c) => [c.id, c.name]));

  for (const issue of issues) {
    if (!issuesByCategoryId[issue.category_id]) {
      issuesByCategoryId[issue.category_id] = [];
    }
    issuesByCategoryId[issue.category_id].push(issue);

    const categoryName = categoryIdToName.get(issue.category_id);
    if (!categoryName) continue;
    if (!issuesByCategoryName[categoryName]) {
      issuesByCategoryName[categoryName] = [];
    }
    issuesByCategoryName[categoryName].push({
      id: issue.id,
      name: issue.name,
      is_active: issue.is_active,
    });
  }

  return { categories, issuesByCategoryId, issuesByCategoryName };
}

export async function getSourceChannelTaxonomy(): Promise<SourceChannelTaxonomy> {
  const [sources, channels] = await Promise.all([
    getComplaintSourcesForManagement(),
    getComplaintChannelsForManagement(),
  ]);

  const channelsBySourceId: Record<string, ComplaintChannel[]> = {};
  const channelsBySourceName: Record<string, TaxonomyItem[]> = {};
  const sourceIdToName = new Map(sources.map((s) => [s.id, s.name]));

  for (const channel of channels) {
    if (!channelsBySourceId[channel.source_id]) {
      channelsBySourceId[channel.source_id] = [];
    }
    channelsBySourceId[channel.source_id].push(channel);

    const sourceName = sourceIdToName.get(channel.source_id);
    if (!sourceName) continue;
    if (!channelsBySourceName[sourceName]) {
      channelsBySourceName[sourceName] = [];
    }
    channelsBySourceName[sourceName].push({
      id: channel.id,
      name: channel.name,
      is_active: channel.is_active,
    });
  }

  return { sources, channelsBySourceId, channelsBySourceName };
}
