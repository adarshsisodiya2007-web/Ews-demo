package com.ews.ner.infra.alert;

import com.ews.ner.domain.alert.Alert;
import com.ews.ner.domain.region.Region;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AlertDispatcherComposite {
    private final List<AlertDispatcher> dispatchers;

    public void dispatch(Alert alert, Region region) {
        for (AlertDispatcher dispatcher : dispatchers) {
            dispatcher.dispatch(alert, region);
        }
    }
}
