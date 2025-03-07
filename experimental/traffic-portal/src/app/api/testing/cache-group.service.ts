/*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
import { Injectable } from "@angular/core";
import type {
	CacheGroupQueueRequest,
	CacheGroupQueueResponse,
	CDN,
	RequestCacheGroup,
	RequestDivision,
	RequestRegion,
	ResponseCacheGroup,
	ResponseASN,
	ResponseDivision,
	ResponseRegion
} from "trafficops-types";

import { ServerService } from "./server.service";

/**
 * The names of properties of {@link ResponseCacheGroup}s that define its
 * primary parentage.
 */
type ParentKeys = "parentCachegroupId" | "parentCachegroupName";
/**
 * The names of properties of {@link ResponseCacheGroup}s that define its
 * secondary parentage.
 */
type SecondaryParentKeys = "secondaryParentCachegroupId" | "secondaryParentCachegroupName";
/**
 * The names of properties of {@link ResponseCacheGroup}s that define its
 * parentage; both primary and secondary.
 */
type AllParentageKeys = ParentKeys | SecondaryParentKeys;

/**
 * The parts of a Cache Group pertaining to its primary parentage.
 */
type Parentage = {
	parentCachegroupId: null;
	parentCachegroupName: null;
} | {
	parentCachegroupId: number;
	parentCachegroupName: string;
};

/**
 * The parts of a Cache Group pertaining to its secondary parentage.
 */
type SecondaryParentage = {
	secondaryParentCachegroupId: null;
	secondaryParentCachegroupName: null;
} | {
	secondaryParentCachegroupId: number;
	secondaryParentCachegroupName: string;
};

/**
 * Contains all information about a Cache Groups parents, primary and secondary.
 */
type AllParentage = Parentage & SecondaryParentage;

/**
 * Checks the type of an argument to
 * {@link CacheGroupService.queueCacheGroupUpdates}.
 *
 * @param x The object to check.
 * @returns Whether `x` is an {@link CacheGroupQueueRequest}.
 */
function isRequest(x: CacheGroupQueueRequest | CDN | string | number): x is CacheGroupQueueRequest {
	return Object.prototype.hasOwnProperty.call(x, "action");
}

/**
 * CDNService expose API functionality relating to CDNs.
 */
@Injectable()
export class CacheGroupService {
	private lastID = 10;

	private readonly asns: Array<ResponseASN> = [{
		asn: 0,
		cachegroup: "Mid",
		cachegroupId: 1,
		id: 1,
		lastUpdated: new Date()
	}
	];
	private readonly divisions: Array<ResponseDivision> = [{
		id: 1,
		lastUpdated: new Date(),
		name: "Div1"
	}
	];
	private readonly regions: Array<ResponseRegion> = [{
		division: 1,
		divisionName: "div1",
		id: 1,
		lastUpdated: new Date(),
		name: "Reg1"
	}
	];
	private readonly cacheGroups: Array<ResponseCacheGroup> = [
		{
			fallbackToClosest: true,
			fallbacks: [],
			id: 1,
			lastUpdated: new Date(),
			latitude: 0,
			localizationMethods: [],
			longitude: 0,
			name: "Mid",
			parentCachegroupId: null,
			parentCachegroupName: null,
			secondaryParentCachegroupId: null,
			secondaryParentCachegroupName: null,
			shortName: "Mid",
			typeId: 1,
			typeName: "MID_LOC"
		},
		{
			fallbackToClosest: true,
			fallbacks: [],
			id: 2,
			lastUpdated: new Date(),
			latitude: 0,
			localizationMethods: [],
			longitude: 0,
			name: "Edge",
			parentCachegroupId: 1,
			parentCachegroupName: "Mid",
			secondaryParentCachegroupId: null,
			secondaryParentCachegroupName: null,
			shortName: "Edge",
			typeId: 2,
			typeName: "EDGE_LOC"
		},
		{
			fallbackToClosest: true,
			fallbacks: [],
			id: 3,
			lastUpdated: new Date(),
			latitude: 0,
			localizationMethods: [],
			longitude: 0,
			name: "Origin",
			parentCachegroupId: null,
			parentCachegroupName: null,
			secondaryParentCachegroupId: null,
			secondaryParentCachegroupName: null,
			shortName: "Origin",
			typeId: 3,
			typeName: "ORG_LOC"
		},
		{
			fallbackToClosest: true,
			fallbacks: [],
			id: 4,
			lastUpdated: new Date(),
			latitude: 0,
			localizationMethods: [],
			longitude: 0,
			name: "Other",
			parentCachegroupId: null,
			parentCachegroupName: null,
			secondaryParentCachegroupId: null,
			secondaryParentCachegroupName: null,
			shortName: "Other",
			typeId: 4,
			typeName: "TC_LOC"
		}
	];

	constructor(private readonly servers: ServerService) {}

	public async getCacheGroups(idOrName: number | string): Promise<ResponseCacheGroup>;
	public async getCacheGroups(): Promise<Array<ResponseCacheGroup>>;
	/**
	 * Gets one or all CDNs from Traffic Ops
	 *
	 * @param idOrName Optionally either the name or integral, unique identifier of a single Cache Group to be returned.
	 * @returns Either an Array of CacheGroup objects, or a single CacheGroup, depending on whether
	 * `idOrName` was 	passed.
	 * @throws {Error} In the event that `idOrName` is passed but does not match any CacheGroup.
	 */
	public async getCacheGroups(idOrName?: number | string): Promise<Array<ResponseCacheGroup> | ResponseCacheGroup> {
		if (idOrName !== undefined) {
			let cacheGroup;
			switch (typeof(idOrName)) {
				case "string":
					cacheGroup = this.cacheGroups.filter(cg=>cg.name===idOrName)[0];
					break;
				case "number":
					cacheGroup = this.cacheGroups.filter(cg=>cg.id===idOrName)[0];
			}
			if (!cacheGroup) {
				throw new Error(`no such Cache Group: ${idOrName}`);
			}
			return cacheGroup;
		}
		return this.cacheGroups;
	}

	/**
	 * Deletes a Cache Group.
	 *
	 * @param cacheGroup The Cache Group to be deleted, or just its ID.
	 */
	public async deleteCacheGroup(cacheGroup: ResponseCacheGroup | number): Promise<void> {
		const id = typeof(cacheGroup) === "number" ? cacheGroup : cacheGroup.id;
		const idx = this.cacheGroups.findIndex(cg => cg.id === id);
		if (idx < 0) {
			throw new Error(`no such Cache Group: #${id}`);
		}
		this.cacheGroups.splice(idx, 1);
	}

	/**
	 * Gets the names of parents for a Cache Group from their IDs.
	 *
	 * @param parentID The ID of a parent Cache Group (or not).
	 * @param secondaryParentID The ID of a "secondary" parent Cache Group (or
	 * not).
	 * @returns The parentage portion of a Cache Group.
	 */
	private getParents(parentID: number | null | undefined, secondaryParentID: number | null | undefined): AllParentage {
		let parent: Parentage = {
			parentCachegroupId: null,
			parentCachegroupName: null
		};
		if (typeof(parentID) === "number") {
			const p = this.cacheGroups.find(cg => cg.id === parentID);
			if (!p) {
				throw new Error(`no such parent Cache Group: #${parentID}`);
			}
			parent = {
				parentCachegroupId: p.id,
				parentCachegroupName: p.name
			};
		}

		let secondaryParent: SecondaryParentage = {
			secondaryParentCachegroupId: null,
			secondaryParentCachegroupName: null
		};
		if (typeof(secondaryParentID) === "number") {
			const p = this.cacheGroups.find(cg => cg.id === secondaryParentID);
			if (!p) {
				throw new Error(`no such secondary parent Cache Group: #${secondaryParentID}`);
			}
			secondaryParent = {
				secondaryParentCachegroupId: p.id,
				secondaryParentCachegroupName: p.name
			};
		}

		return {
			...parent,
			...secondaryParent
		};
	}

	/**
	 * Creates a new Cache Group.
	 *
	 * @param cacheGroup The Cache Group to create.
	 */
	public async createCacheGroup(cacheGroup: RequestCacheGroup): Promise<ResponseCacheGroup> {
		const cg = {
			...cacheGroup,
			...this.getParents(cacheGroup.parentCachegroupId, cacheGroup.secondaryParentCachegroupId),
			fallbackToClosest: cacheGroup.fallbackToClosest ?? false,
			fallbacks: cacheGroup.fallbacks ?? [],
			id: ++this.lastID,
			lastUpdated: new Date(),
			latitude: cacheGroup.latitude ?? 0,
			localizationMethods: cacheGroup.localizationMethods ?? [],
			longitude: cacheGroup.longitude ?? 0,
			typeName: "",
		};
		this.cacheGroups.push(cg);
		return cg;
	}

	/**
	 * Replaces an existing Cache Group with the provided new definition of a
	 * Cache Group.
	 *
	 * @param id The if of the Cache Group being updated.
	 * @param cacheGroup The new definition of the Cache Group.
	 */
	public async updateCacheGroup(id: number, cacheGroup: RequestCacheGroup): Promise<ResponseCacheGroup>;
	/**
	 * Replaces an existing Cache Group with the provided new definition of a
	 * Cache Group.
	 *
	 * @param cacheGroup The full new definition of the Cache Group being
	 * updated.
	 */
	public async updateCacheGroup(cacheGroup: ResponseCacheGroup): Promise<ResponseCacheGroup>;
	/**
	 * Replaces an existing Cache Group with the provided new definition of a
	 * Cache Group.
	 *
	 * @param cacheGroupOrID The full new definition of the Cache Group being
	 * updated, or just its ID.
	 * @param payload The new definition of the Cache Group. This is required if
	 * `cacheGroupOrID` is an ID, and ignored otherwise.
	 */
	public async updateCacheGroup(cacheGroupOrID: ResponseCacheGroup | number, payload?: RequestCacheGroup): Promise<ResponseCacheGroup> {
		let idx;
		let cg: Omit<ResponseCacheGroup, AllParentageKeys>;
		let parentCachegroupId;
		let secondaryParentCachegroupId;
		if (typeof(cacheGroupOrID) === "number") {
			if (!payload) {
				throw new TypeError("invalid call signature - missing request payload");
			}
			idx = this.cacheGroups.findIndex(c => c.id === cacheGroupOrID);
			cg = {
				...payload,
				fallbackToClosest: payload.fallbackToClosest ?? false,
				fallbacks: payload.fallbacks ?? [],
				id: ++this.lastID,
				lastUpdated: new Date(),
				latitude: payload.latitude ?? 0,
				localizationMethods: payload.localizationMethods ?? [],
				longitude: payload.longitude ?? 0,
				typeName: "",
			};
			parentCachegroupId = payload.parentCachegroupId;
			secondaryParentCachegroupId = payload.secondaryParentCachegroupId;
		} else {
			idx = this.cacheGroups.findIndex(c => c.id === cacheGroupOrID.id);
			cg = {
				...cacheGroupOrID,
				lastUpdated: new Date()
			};
			parentCachegroupId = cacheGroupOrID.parentCachegroupId;
			secondaryParentCachegroupId = cacheGroupOrID.secondaryParentCachegroupId;
		}

		if (idx < 0) {
			throw new Error(`no such Cache Group: #${cacheGroupOrID}`);
		}

		const final = {
			...cg,
			...this.getParents(parentCachegroupId, secondaryParentCachegroupId)
		};

		this.cacheGroups[idx] = final;

		return final;
	}

	/**
	 * Queues (or dequeues) updates on a Cache Group's servers.
	 *
	 * @param cacheGroupOrID The Cache Group on which updates will be queued, or
	 * just its ID.
	 * @param cdnOrIdentifier Either a CDN, its name, or its ID.
	 * @param action Used to determine the queue action to take. If not given,
	 * defaults to `queue`.
	 * @returns The API's response.
	 */
	public async queueCacheGroupUpdates(
		cacheGroupOrID: ResponseCacheGroup | number,
		cdnOrIdentifier: CDN | string | number,
		action?: "queue" | "dequeue"
	): Promise<CacheGroupQueueResponse>;
	/**
	 * Queues (or dequeues) updates on a Cache Group's servers.
	 *
	 * @param cacheGroupOrID The Cache Group on which updates will be queued, or
	 * just its ID.
	 * @param request The full (de/)queue request.
	 * @returns The API's response.
	 */
	public async queueCacheGroupUpdates(
		cacheGroupOrID: ResponseCacheGroup | number,
		request: CacheGroupQueueRequest
	): Promise<CacheGroupQueueResponse>;
	/**
	 * Queues (or dequeues) updates on a Cache Group's servers.
	 *
	 * @param cacheGroupOrID The Cache Group on which updates will be queued, or
	 * just its ID.
	 * @param cdnOrIdentifierOrRequest Either the full (de/)queue request or a
	 * CDN, its name, or its ID.
	 * @param action If `cdnOrIdentifierOrRequest` is not a full (de/)queue
	 * request, then this will be used to determine the queue action to take. If
	 * not given, defaults to `queue`.
	 * @returns The API's response.
	 */
	public async queueCacheGroupUpdates(
		cacheGroupOrID: ResponseCacheGroup | number,
		cdnOrIdentifierOrRequest: CacheGroupQueueRequest | CDN | string | number,
		action?: "queue" | "dequeue"
	): Promise<CacheGroupQueueResponse> {
		const cachegroupID = typeof(cacheGroupOrID) === "number" ? cacheGroupOrID : cacheGroupOrID.id;
		const cg = this.cacheGroups.find(c => c.id === cachegroupID);
		if (!cg) {
			throw new Error(`no such Cache Group: #${cachegroupID}`);
		}

		let cdn;
		if (isRequest(cdnOrIdentifierOrRequest)) {
			action = cdnOrIdentifierOrRequest.action;
			cdn = cdnOrIdentifierOrRequest.cdn ?? cdnOrIdentifierOrRequest.cdnId;
		} else {
			action = action ?? "queue";
			switch (typeof(cdnOrIdentifierOrRequest)) {
				case "string":
				case "number":
					cdn = cdnOrIdentifierOrRequest;
					break;
				default:
					cdn = cdnOrIdentifierOrRequest.name;
			}
		}
		const updPendingValue = action === "queue";
		const serverNames = [];
		for (const server of this.servers.servers) {
			if (server.cachegroupId === cachegroupID && (server.cdnId === cdn || server.cdnName === cdn)) {
				server.updPending = updPendingValue;
				serverNames.push(server.hostName);
			}
		}
		return {
			action,
			cachegroupID,
			cachegroupName: cg.name,
			cdn: String(cdn),
			serverNames,
		};
	}
	public async getDivisions(): Promise<Array<ResponseDivision>>;
	public async getDivisions(nameOrID: string | number): Promise<ResponseDivision>;

	/**
	 * Gets an array of divisions from Traffic Ops.
	 *
	 * @param nameOrID If given, returns only the ResponseDivision with the given name
	 * (string) or ID (number).
	 * @returns An Array of ResponseDivision objects - or a single ResponseDivision object if 'nameOrID'
	 * was given.
	 */
	public async getDivisions(nameOrID?: string | number): Promise<Array<ResponseDivision> | ResponseDivision> {
		if(nameOrID) {
			let division;
			switch (typeof nameOrID) {
				case "string":
					division = this.divisions.find(d=>d.name === nameOrID);
					break;
				case "number":
					division = this.divisions.find(d=>d.id === nameOrID);
			}
			if (!division) {
				throw new Error(`no such Division: ${nameOrID}`);
			}
			return division;
		}
		return this.divisions;
	}

	/**
	 * Replaces the current definition of a division with the one given.
	 *
	 * @param division The new division.
	 * @returns The updated division.
	 */
	public async updateDivision(division: ResponseDivision): Promise<ResponseDivision> {
		const id = this.divisions.findIndex(d => d.id === division.id);
		if (id === -1) {
			throw new Error(`no such Division: ${division.id}`);
		}
		this.divisions[id] = division;
		return division;
	}

	/**
	 * Creates a new division.
	 *
	 * @param division The division to create.
	 * @returns The created division.
	 */
	public async createDivision(division: RequestDivision): Promise<ResponseDivision> {
		const div = {
			...division,
			id: ++this.lastID,
			lastUpdated: new Date()
		};
		this.divisions.push(div);
		return div;
	}

	/**
	 * Deletes an existing division.
	 *
	 * @param id Id of the division to delete.
	 * @returns The deleted division.
	 */
	public async deleteDivision(id: number): Promise<ResponseDivision> {
		const index = this.divisions.findIndex(d => d.id === id);
		if (index === -1) {
			throw new Error(`no such Division: ${id}`);
		}
		return this.divisions.splice(index, 1)[0];
	}

	public async getRegions(): Promise<Array<ResponseRegion>>;
	public async getRegions(nameOrID: string | number): Promise<ResponseRegion>;

	/**
	 * Gets an array of regions from Traffic Ops.
	 *
	 * @param nameOrID If given, returns only the ResponseRegion with the given name
	 * (string) or ID (number).
	 * @returns An Array of ResponseRegion objects - or a single ResponseRegion object if 'nameOrID'
	 * was given.
	 */
	public async getRegions(nameOrID?: string | number): Promise<Array<ResponseRegion> | ResponseRegion> {
		if(nameOrID) {
			let region;
			switch (typeof nameOrID) {
				case "string":
					region = this.regions.find(d=>d.name === nameOrID);
					break;
				case "number":
					region = this.regions.find(d=>d.id === nameOrID);
			}
			if (!region) {
				throw new Error(`no such Region: ${nameOrID}`);
			}
			return region;
		}
		return this.regions;
	}

	/**
	 * Replaces the current definition of a region with the one given.
	 *
	 * @param region The new region.
	 * @returns The updated region.
	 */
	public async updateRegion(region: ResponseRegion): Promise<ResponseRegion> {
		const id = this.regions.findIndex(d => d.id === region.id);
		if (id === -1) {
			throw new Error(`no such Region: ${region.id}`);
		}
		this.regions[id] = region;
		return region;
	}

	/**
	 * Creates a new region.
	 *
	 * @param region The region to create.
	 * @returns The created region.
	 */
	public async createRegion(region: RequestRegion): Promise<ResponseRegion> {
		const reg = {
			divisionName: this.divisions.find(d => d.id === region.division)?.name ?? "",
			...region,
			id: ++this.lastID,
			lastUpdated: new Date()
		};
		this.regions.push(reg);
		return reg;
	}

	/**
	 * Deletes an existing region.
	 *
	 * @param id Id of the region to delete.
	 * @returns The deleted region.
	 */
	public async deleteRegion(id: number | ResponseRegion): Promise<ResponseRegion> {
		const index = this.regions.findIndex(d => d.id === id);
		if (index === -1) {
			throw new Error(`no such Region: ${id}`);
		}
		return this.regions.splice(index, 1)[0];
	}

	public async getASNs(): Promise<Array<ResponseASN>>;
	public async getASNs(id: number): Promise<ResponseASN>;

	/**
	 * Gets an array of ASNs from Traffic Ops.
	 *
	 * @param id If given, returns only the asn with the given id (number).
	 * @returns An Array of ASNs objects - or a single ASN object if 'id'
	 * was given.
	 */
	public async getASNs(id?: number): Promise<Array<ResponseASN> | ResponseASN> {
		if(id) {
			const asn = this.asns.find(a=>a.id === id);
			if (!asn) {
				throw new Error(`no such asn with id: ${id}`);
			}
			return asn;
		}
		return this.asns;
	}

	/**
	 * Deletes an existing asn.
	 *
	 * @param asn Id of the asn to delete.
	 * @returns The deleted asn.
	 */
	public async deleteASN(asn: number | ResponseASN): Promise<ResponseASN> {
		const index = this.asns.findIndex(a => a.asn === asn);
		if (index === -1) {
			throw new Error(`no such asn: ${asn}`);
		}
		return this.asns.splice(index, 1)[0];
	}
}
