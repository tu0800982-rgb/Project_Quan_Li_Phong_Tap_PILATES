package com.nhom8.pilates.repository;

import com.nhom8.pilates.entity.Attendance;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.time.Instant;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Attendance a join fetch a.registration r join fetch r.memberPackage " +
            "where a.schedule.id=:scheduleId and a.member.id=:memberId")
    Optional<Attendance> findForUpdate(@Param("scheduleId") Long scheduleId, @Param("memberId") Long memberId);

    @EntityGraph(attributePaths = {"schedule", "schedule.pilatesClass", "member", "registration"})
    List<Attendance> findByMemberIdOrderByScheduleStartsAtDesc(Long memberId);
    @EntityGraph(attributePaths = {"schedule", "schedule.pilatesClass", "schedule.trainer", "member", "registration"})
    List<Attendance> findAllByOrderByScheduleStartsAtDesc();
    @EntityGraph(attributePaths = {"schedule", "schedule.pilatesClass", "schedule.trainer", "member", "registration"})
    List<Attendance> findByScheduleTrainerIdOrderByScheduleStartsAtDesc(Long trainerId);
    List<Attendance> findByScheduleId(Long scheduleId);
    @Query("select count(a) from Attendance a where a.markedAt>=:from and a.markedAt<:to and a.schedule.startsAt<=:now")
    long countByMarkedAtInPast(@Param("from") Instant from,@Param("to") Instant to,@Param("now") Instant now);
}
