package com.nhom8.pilates.service;

import com.nhom8.pilates.dto.request.RegisterPackageRequest;
import com.nhom8.pilates.dto.response.*;
import com.nhom8.pilates.entity.*;
import com.nhom8.pilates.enums.*;
import com.nhom8.pilates.exception.BusinessException;
import com.nhom8.pilates.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
public class MemberPackageService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final MemberPackageRepository memberPackageRepository;
    private final PaymentRepository paymentRepository;
    private final MemberRepository memberRepository;
    private final PilatesPackageRepository packageRepository;
    private final CurrentUserService currentUserService;

    public MemberPackageService(MemberPackageRepository memberPackageRepository, PaymentRepository paymentRepository,
                                MemberRepository memberRepository, PilatesPackageRepository packageRepository,
                                CurrentUserService currentUserService) {
        this.memberPackageRepository = memberPackageRepository;
        this.paymentRepository = paymentRepository;
        this.memberRepository = memberRepository;
        this.packageRepository = packageRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional
    public PackageRegistrationResponse register(RegisterPackageRequest request) {
        User actor = currentUserService.requireUser();
        Member member = resolveMember(actor, request.getMemberId());
        PilatesPackage selectedPackage = packageRepository.findById(request.getPackageId())
                .orElseThrow(() -> new BusinessException("PACKAGE_NOT_FOUND", "Không tìm thấy gói tập",
                        HttpStatus.NOT_FOUND));
        if (selectedPackage.getStatus() != RecordStatus.ACTIVE) {
            throw new BusinessException("PACKAGE_INACTIVE", "Gói tập đang ngừng kinh doanh", HttpStatus.CONFLICT);
        }

        LocalDate today = LocalDate.now(ZONE);
        MemberPackage memberPackage = new MemberPackage();
        memberPackage.setMember(member);
        memberPackage.setPilatesPackage(selectedPackage);
        memberPackage.setStartDate(today);
        memberPackage.setEndDate(today.plusDays(selectedPackage.getDurationDays() - 1L));
        memberPackage.setTotalSessions(selectedPackage.getSessionCount());
        memberPackage.setRemainingSessions(selectedPackage.getSessionCount());
        memberPackage.setStatus(MemberPackageStatus.PENDING_PAYMENT);
        memberPackage.setCreatedBy(actor);
        memberPackageRepository.save(memberPackage);

        Payment payment = new Payment();
        payment.setTransactionCode("TXN-" + UUID.randomUUID().toString().replace("-", ""));
        payment.setMember(member);
        payment.setMemberPackage(memberPackage);
        payment.setAmount(selectedPackage.getPrice());
        payment.setMethod(request.getPaymentMethod());
        payment.setStatus(PaymentStatus.PENDING);
        paymentRepository.save(payment);
        return new PackageRegistrationResponse(new MemberPackageResponse(memberPackage), new PaymentResponse(payment));
    }

    @Transactional
    public List<MemberPackageResponse> myPackages() {
        expirePackages();
        User actor = currentUserService.requireUser();
        Member member = memberRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new BusinessException("MEMBER_PROFILE_NOT_FOUND", "Tài khoản chưa có hồ sơ hội viên",
                        HttpStatus.NOT_FOUND));
        return memberPackageRepository.findByMemberIdOrderByCreatedAtDesc(member.getId()).stream()
                .map(MemberPackageResponse::new).toList();
    }

    @Transactional
    public List<MemberPackageResponse> packagesOf(Long memberId) {
        expirePackages();
        if(!memberRepository.existsById(memberId))throw new BusinessException("MEMBER_NOT_FOUND","Không tìm thấy hội viên",HttpStatus.NOT_FOUND);
        return memberPackageRepository.findByMemberIdOrderByCreatedAtDesc(memberId).stream().map(MemberPackageResponse::new).toList();
    }

    @Transactional
    public PackageRegistrationResponse renew(Long memberPackageId, PaymentMethod paymentMethod) {
        User actor = currentUserService.requireUser();
        expirePackages();
        MemberPackage previous = memberPackageRepository.findEligibleByIdForUpdate(memberPackageId)
                .orElseThrow(() -> new BusinessException("MEMBER_PACKAGE_NOT_FOUND", "Member package not found", HttpStatus.NOT_FOUND));
        authorizeMember(actor, previous.getMember().getId());
        if (previous.getStatus() != MemberPackageStatus.ACTIVE && previous.getStatus() != MemberPackageStatus.EXPIRED) {
            throw new BusinessException("PACKAGE_NOT_RENEWABLE", "Only active or expired packages can be renewed", HttpStatus.CONFLICT);
        }
        if (memberPackageRepository.findFirstByRenewedFromIdAndStatus(memberPackageId, MemberPackageStatus.PENDING_PAYMENT).isPresent()) {
            throw new BusinessException("RENEWAL_ALREADY_PENDING", "This package already has a pending renewal", HttpStatus.CONFLICT);
        }
        LocalDate today = LocalDate.now(ZONE);
        LocalDate start = previous.getStatus() == MemberPackageStatus.ACTIVE && !previous.getEndDate().isBefore(today)
                ? previous.getEndDate().plusDays(1) : today;
        PilatesPackage selectedPackage = previous.getPilatesPackage();
        MemberPackage renewal = new MemberPackage();
        renewal.setMember(previous.getMember());
        renewal.setPilatesPackage(selectedPackage);
        renewal.setStartDate(start);
        renewal.setEndDate(start.plusDays(selectedPackage.getDurationDays() - 1L));
        renewal.setTotalSessions(selectedPackage.getSessionCount());
        renewal.setRemainingSessions(selectedPackage.getSessionCount());
        renewal.setStatus(MemberPackageStatus.PENDING_PAYMENT);
        renewal.setRenewedFrom(previous);
        renewal.setCreatedBy(actor);
        memberPackageRepository.save(renewal);

        Payment payment = new Payment();
        payment.setTransactionCode("TXN-" + UUID.randomUUID().toString().replace("-", ""));
        payment.setMember(previous.getMember());
        payment.setMemberPackage(renewal);
        payment.setAmount(selectedPackage.getPrice());
        payment.setMethod(paymentMethod);
        payment.setStatus(PaymentStatus.PENDING);
        paymentRepository.save(payment);
        return new PackageRegistrationResponse(new MemberPackageResponse(renewal), new PaymentResponse(payment));
    }

    @Transactional
    public void expirePackages() {
        LocalDate today = LocalDate.now(ZONE);
        memberPackageRepository.findByStatusAndEndDateBefore(MemberPackageStatus.ACTIVE, today)
                .forEach(item -> item.setStatus(MemberPackageStatus.EXPIRED));
    }

    private void authorizeMember(User actor, Long memberId) {
        if (actor.getRole().getCode() != RoleCode.MEMBER) return;
        Member own = memberRepository.findByUserId(actor.getId())
                .orElseThrow(() -> new BusinessException("MEMBER_PROFILE_NOT_FOUND", "Member profile not found", HttpStatus.NOT_FOUND));
        if (!own.getId().equals(memberId)) {
            throw new BusinessException("ACCESS_DENIED", "You can only renew your own package", HttpStatus.FORBIDDEN);
        }
    }

    private Member resolveMember(User actor, Long requestedMemberId) {
        if (actor.getRole().getCode() == RoleCode.MEMBER) {
            Member own = memberRepository.findByUserId(actor.getId())
                    .orElseThrow(() -> new BusinessException("MEMBER_PROFILE_NOT_FOUND",
                            "Tài khoản chưa có hồ sơ hội viên", HttpStatus.NOT_FOUND));
            if (requestedMemberId != null && !requestedMemberId.equals(own.getId())) {
                throw new BusinessException("ACCESS_DENIED", "Bạn chỉ được đăng ký gói cho bản thân",
                        HttpStatus.FORBIDDEN);
            }
            return own;
        }
        if (requestedMemberId == null) {
            throw new BusinessException("MEMBER_REQUIRED", "Vui lòng chọn hội viên", HttpStatus.BAD_REQUEST);
        }
        return memberRepository.findById(requestedMemberId)
                .orElseThrow(() -> new BusinessException("MEMBER_NOT_FOUND", "Không tìm thấy hội viên",
                        HttpStatus.NOT_FOUND));
    }
}
