"use client";

import { useCallback, useEffect, useState } from "react";
import { schoolService } from "@/services";
import type {
  AcademicYear,
  AttendanceReport,
  AttendanceRosterStudent,
  AttendanceSession,
  CreateAcademicSectionInput,
  CreateAcademicYearInput,
  CreateClassroomInput,
  AcademicReport,
  Assignment,
  AttendanceRecord,
  Classroom,
  FeeRecord,
  PortalOverview,
  PortalRole,
  School,
  SchoolOverview,
  SchoolRole,
  SchoolSettingsData,
  SchoolProfile,
  UpdateSchoolProfileInput,
  StaffMember,
  Student,
  StudentCreateInput,
  StudentInput,
  StudentPage,
} from "@/types/school";

type ResourceState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

function useRemoteResource<T>(
  load: ((signal: AbortSignal) => Promise<T>) | null,
): ResourceState<T> {
  const [resource, setResource] = useState<{
    data: T | null;
    error: string | null;
    isLoading: boolean;
    load: typeof load | null;
  }>({ data: null, error: null, isLoading: true, load: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!load) return;
    const controller = new AbortController();
    void Promise.resolve()
      .then(() => load(controller.signal))
      .then(
        (data) => {
          if (!controller.signal.aborted) {
            setResource({ data, error: null, isLoading: false, load });
          }
        },
        (reason: unknown) => {
          if (!controller.signal.aborted) {
            setResource({
              data: null,
              error: reason instanceof Error ? reason.message : "Unable to load this information.",
              isLoading: false,
              load,
            });
          }
        },
      );

    return () => controller.abort();
  }, [load, version]);

  const refresh = useCallback(() => {
    setResource((current) => ({ ...current, isLoading: true, error: null }));
    setVersion((current) => current + 1);
  }, []);
  const isCurrentLoad = resource.load === load;
  if (!load) {
    return { data: null, error: null, isLoading: false, refresh };
  }
  return {
    data: isCurrentLoad ? resource.data : null,
    isLoading: !isCurrentLoad || resource.isLoading,
    error: isCurrentLoad ? resource.error : null,
    refresh,
  };
}

export function useSchoolOverview(role: SchoolRole) {
  const load = useCallback(
    (signal: AbortSignal) => schoolService.getOverview(role, signal),
    [role],
  );
  return useRemoteResource<SchoolOverview>(load);
}

export function usePortalOverview(role: PortalRole) {
  const load = useCallback(
    (signal: AbortSignal) => schoolService.getPortalOverview(role, signal),
    [role],
  );
  return useRemoteResource<PortalOverview>(load);
}

export function useStudents() {
  return useStudentsPage(1);
}

export function useStudentsPage(page: number, pageSize = 20) {
  const load = useCallback(
    (signal: AbortSignal) => schoolService.getStudents(page, pageSize, signal),
    [page, pageSize],
  );
  return useRemoteResource<StudentPage>(load);
}

export function useStudent(id: string) {
  const load = useCallback(
    (signal: AbortSignal) => schoolService.getStudent(id, signal),
    [id],
  );
  return useRemoteResource<Student>(id ? load : null);
}

export function useSaveStudent() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async (id: string | null, input: StudentCreateInput | StudentInput) => {
    setIsPending(true);
    setError(null);
    try {
      if (id) {
        return await schoolService.updateStudent(id, input as StudentInput);
      }
      if (!id && "admissionNumber" in input && typeof input.admissionNumber === "string") {
        return await schoolService.createStudent(input as StudentCreateInput);
      }
      throw new Error("Student input does not match the requested operation.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save this student.");
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { save, isPending, error };
}

export function useStaff() {
  const load = useCallback((signal: AbortSignal) => schoolService.getStaff(signal), []);
  return useRemoteResource<StaffMember[]>(load);
}

export function useClassrooms() {
  const load = useCallback((signal: AbortSignal) => schoolService.getClassrooms(signal), []);
  return useRemoteResource<Classroom[]>(load);
}

export function useCreateClassroom() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCallback(async (input: CreateClassroomInput) => {
    setIsPending(true);
    setError(null);
    try {
      return await schoolService.createClassroom(input);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the class.");
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);
  return { create, isPending, error };
}

export function useCreateAcademicSection() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCallback(async (input: CreateAcademicSectionInput) => {
    setIsPending(true);
    setError(null);
    try {
      return await schoolService.createAcademicSection(input);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the section.");
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);
  return { create, isPending, error };
}

export function useSchools() {
  const load = useCallback((signal: AbortSignal) => schoolService.getSchools(signal), []);
  return useRemoteResource<School[]>(load);
}

export function useAttendance() {
  const load = useCallback((signal: AbortSignal) => schoolService.getAttendance(signal), []);
  return useRemoteResource<AttendanceRecord[]>(load);
}

export function useAttendanceReport(fromDate: string | null, toDate: string | null) {
  const load = useCallback(
    (signal: AbortSignal) => {
      if (!fromDate || !toDate) {
        throw new Error("A date range is required to generate an attendance report.");
      }
      return schoolService.getAttendanceReport(fromDate, toDate, signal);
    },
    [fromDate, toDate],
  );
  return useRemoteResource<AttendanceReport>(fromDate && toDate ? load : null);
}

export function useAcademicReports() {
  const load = useCallback((signal: AbortSignal) => schoolService.getReports(signal), []);
  return useRemoteResource<AcademicReport[]>(load);
}

export function useFees(enabled = true) {
  const load = useCallback(
    (signal: AbortSignal) => schoolService.getFees(signal),
    [],
  );
  return useRemoteResource<FeeRecord[]>(enabled ? load : null);
}

export function useAssignments(enabled = true) {
  const load = useCallback(
    (signal: AbortSignal) => schoolService.getAssignments(signal),
    [],
  );
  return useRemoteResource<Assignment[]>(enabled ? load : null);
}

export function useAcademicYears() {
  const load = useCallback((signal: AbortSignal) => schoolService.getAcademicYears(signal), []);
  return useRemoteResource<AcademicYear[]>(load);
}

export function useCreateAcademicYear() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = useCallback(async (input: CreateAcademicYearInput) => {
    setIsPending(true);
    setError(null);
    try {
      return await schoolService.createAcademicYear(input);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the academic year.");
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);
  return { create, isPending, error };
}

export function useSchoolProfile() {
  const load = useCallback((signal: AbortSignal) => schoolService.getSchoolProfile(signal), []);
  return useRemoteResource<SchoolProfile>(load);
}

export function useUpdateSchoolProfile() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = useCallback(async (profile: UpdateSchoolProfileInput) => {
    setIsPending(true);
    setError(null);
    try {
      return await schoolService.updateSchoolProfile(profile);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update the school profile.");
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);
  return { update, isPending, error };
}

export function useAttendanceSessions(date: string, enabled = true) {
  const load = useCallback(
    (signal: AbortSignal) => schoolService.getAttendanceSessions(date, signal),
    [date],
  );
  return useRemoteResource<AttendanceSession[]>(enabled ? load : null);
}

export function useAttendanceRoster(sessionId: string | null) {
  const load = useCallback(
    (signal: AbortSignal) => sessionId
      ? schoolService.getAttendanceRoster(sessionId, signal)
      : Promise.resolve([] as AttendanceRosterStudent[]),
    [sessionId],
  );
  return useRemoteResource<AttendanceRosterStudent[]>(sessionId ? load : null);
}

export function useAttendanceActions() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | null> => {
    setIsPending(true);
    setError(null);
    try {
      return await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save attendance.");
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);
  return { run, isPending, error };
}

export function useSchoolSettings() {
  const load = useCallback((signal: AbortSignal) => schoolService.getSettings(signal), []);
  return useRemoteResource<SchoolSettingsData>(load);
}

export function useUpdateSchoolSettings() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(async (settings: SchoolSettingsData) => {
    setIsPending(true);
    setError(null);
    try {
      return await schoolService.updateSettings(settings);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save school settings.");
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { update, isPending, error };
}
