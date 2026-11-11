import { useEffect } from "react";

export type TeacherRealtimeEvent =
  | {
      type: "assessment_submission";
      assessmentId: string;
      studentId: string;
    }
  | {
      type: "student_assignment_changed";
      studentId: string;
      classId: string;
    }
  | {
      type: "class_changed";
      classId: string;
    };

type RealtimeHandler = (event: TeacherRealtimeEvent) => void;

export function useTeacherRealtime(
  teacherId: string,
  handler: RealtimeHandler
) {
  useEffect(() => {
    if (!teacherId) {
      return;
    }

    const channel = new BroadcastChannel(
      `teacher:${teacherId}`
    );

    const handleMessage = (
      message: MessageEvent<TeacherRealtimeEvent>
    ) => {
      handler(message.data);
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [teacherId, handler]);
}