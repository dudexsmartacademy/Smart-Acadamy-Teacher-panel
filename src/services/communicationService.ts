import {
  announcementService,
  type AnnouncementCategory,
  type AnnouncementItem,
} from "./announcementService";

export type CommunicationType = AnnouncementCategory;

export type CommunicationItem = {
  id: number | string;
  type: CommunicationType;
  title: string;
  content: string;
  className: string;
  classId: string;
  /** Global batches the message is for; empty means all students. */
  batches?: string[];
  subject: string;
  student?: string;
  priority?: string;
  status: string;
  date: string;
  archived?: boolean;
};

// Every communication is an announcement row (category = type), so students
// receive it in their portal. Nothing is kept only in this browser.
function toCommunication(ann: AnnouncementItem): CommunicationItem {
  return {
    id: ann.id,
    type: ann.category || "Announcements",
    title: ann.title,
    content: ann.content,
    className: ann.className || "All Batches",
    classId: ann.classId || "all",
    batches: ann.batches,
    subject: ann.subject || "General",
    priority: ann.priority,
    status: ann.status,
    date: ann.publishDate ? ann.publishDate.split("T")[0] : new Date().toISOString().split("T")[0],
    archived: ann.status === "Archived",
  };
}

const toPriority = (p?: string): "Low" | "Normal" | "High" =>
  p === "High" ? "High" : p === "Low" ? "Low" : "Normal";

const toStatus = (s?: string): "Published" | "Draft" | "Archived" => {
  const v = (s || "").toLowerCase();
  return v === "draft" ? "Draft" : v === "archived" ? "Archived" : "Published";
};

export const communicationService = {
  async getCommunications(filterType?: CommunicationType): Promise<CommunicationItem[]> {
    const res = await announcementService.getAnnouncements();
    if (res.error) throw new Error(res.error);
    const items = res.data.map(toCommunication);
    return filterType ? items.filter((item) => item.type === filterType) : items;
  },

  async getCommunicationById(id: string | number): Promise<CommunicationItem | null> {
    const res = await announcementService.getAnnouncementById(String(id));
    if (res.error || !res.data) return null;
    return toCommunication(res.data);
  },

  async createCommunication(item: Omit<CommunicationItem, "id">): Promise<CommunicationItem> {
    const res = await announcementService.createAnnouncement({
      title: item.title,
      content: item.content,
      className: item.className || "All Students",
      classId: item.classId || "all",
      batches: item.batches || [],
      subject: item.subject || "General",
      priority: toPriority(item.priority),
      status: toStatus(item.status),
      category: item.type,
      publishDate: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
      expiryDate: "",
    });
    if (res.error || !res.data) {
      throw new Error(res.error || "Could not save the communication.");
    }
    return toCommunication(res.data);
  },

  async updateCommunication(
    id: string | number,
    updates: Partial<CommunicationItem>
  ): Promise<CommunicationItem | null> {
    const res = await announcementService.updateAnnouncement(String(id), {
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.content !== undefined ? { content: updates.content } : {}),
      ...(updates.priority !== undefined ? { priority: toPriority(updates.priority) } : {}),
      ...(updates.status !== undefined ? { status: toStatus(updates.status) } : {}),
      ...(updates.archived ? { status: "Archived" as const } : {}),
      ...(updates.type !== undefined ? { category: updates.type } : {}),
      ...(updates.className !== undefined ? { className: updates.className } : {}),
      ...(updates.classId !== undefined ? { classId: updates.classId } : {}),
      ...(updates.batches !== undefined ? { batches: updates.batches } : {}),
      ...(updates.date !== undefined ? { publishDate: new Date(updates.date).toISOString() } : {}),
    });
    if (!res.success) throw new Error(res.error || "Could not update the communication.");
    return this.getCommunicationById(id);
  },

  async deleteCommunication(id: string | number): Promise<boolean> {
    const res = await announcementService.deleteAnnouncement(String(id));
    if (!res.success) throw new Error(res.error || "Could not delete the communication.");
    return true;
  },
};
