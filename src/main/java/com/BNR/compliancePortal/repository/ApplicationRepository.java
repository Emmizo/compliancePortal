package com.BNR.compliancePortal.repository;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.ApplicationStatus;
import com.BNR.compliancePortal.domain.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    List<Application> findAllByApplicantOrderByUpdatedAtDescIdDesc(User applicant);

    List<Application> findAllByAssignedReviewerOrderByUpdatedAtDescIdDesc(User reviewer);

    List<Application> findAllByStatusOrderByUpdatedAtDescIdDesc(ApplicationStatus status);

    List<Application> findAllByOrderByUpdatedAtDescIdDesc();
}
