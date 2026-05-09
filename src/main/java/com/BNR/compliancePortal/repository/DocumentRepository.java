package com.BNR.compliancePortal.repository;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.Document;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findAllByApplicationOrderByVersionNumberAscIdAsc(Application application);

    @Query("select coalesce(max(d.versionNumber), 0) from Document d where d.application = :application")
    int findMaxVersionForApplication(@Param("application") Application application);
}
